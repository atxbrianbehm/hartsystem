import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../api/client';
import { AssetForm } from '../components/AssetForm';
import { AssetTable } from '../components/AssetTable';
export const DashboardPage = ({ user, onLogout }) => {
    const [sites, setSites] = useState([]);
    const [assets, setAssets] = useState([]);
    const [selectedSiteId, setSelectedSiteId] = useState(user.role === 'field_user' ? user.siteId : null);
    const [siteSearchTerm, setSiteSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [equipmentFilter, setEquipmentFilter] = useState('all');
    const [sortBy, setSortBy] = useState('assetNumberAsc');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(undefined);
    const [scanInput, setScanInput] = useState('');
    const [scanResult, setScanResult] = useState(null);
    const [deleteCandidate, setDeleteCandidate] = useState(null);
    const [pendingUndoDelete, setPendingUndoDelete] = useState(null);
    const [actionMessage, setActionMessage] = useState(null);
    const deleteTimerRef = useRef(null);
    const formAnchorRef = useRef(null);
    const siteCounts = useMemo(() => {
        return assets.reduce((counts, asset) => {
            counts[asset.siteId] = (counts[asset.siteId] ?? 0) + 1;
            return counts;
        }, {});
    }, [assets]);
    const sortedSites = useMemo(() => {
        return [...sites].sort((left, right) => {
            const countDiff = (siteCounts[right.id] ?? 0) - (siteCounts[left.id] ?? 0);
            if (countDiff !== 0) {
                return countDiff;
            }
            return left.name.localeCompare(right.name);
        });
    }, [siteCounts, sites]);
    const populatedSites = useMemo(() => {
        return sortedSites.filter((site) => (siteCounts[site.id] ?? 0) > 0);
    }, [siteCounts, sortedSites]);
    const siteOptions = useMemo(() => {
        const search = siteSearchTerm.trim().toLowerCase();
        if (!search) {
            return sortedSites;
        }
        return sortedSites.filter((site) => {
            return [site.name, site.code].some((value) => value.toLowerCase().includes(search));
        });
    }, [siteSearchTerm, sortedSites]);
    const visibleAssets = useMemo(() => {
        if (!selectedSiteId) {
            return assets;
        }
        return assets.filter((asset) => asset.siteId === selectedSiteId);
    }, [assets, selectedSiteId]);
    const equipmentTypes = useMemo(() => {
        return [...new Set(visibleAssets.map((asset) => asset.equipmentType).filter(Boolean))].sort((left, right) => left.localeCompare(right));
    }, [visibleAssets]);
    const filteredAssets = useMemo(() => {
        const results = visibleAssets.filter((asset) => {
            if (statusFilter !== 'all') {
                const matchesCalibration = asset.calibrationStatus === statusFilter;
                const matchesDamage = asset.damageStatus === statusFilter;
                if (!matchesCalibration && !matchesDamage) {
                    return false;
                }
            }
            if (equipmentFilter !== 'all' && asset.equipmentType !== equipmentFilter) {
                return false;
            }
            return true;
        });
        return [...results].sort((left, right) => {
            switch (sortBy) {
                case 'assetNumberDesc':
                    return right.assetNumber.localeCompare(left.assetNumber);
                case 'itemNameAsc':
                    return left.itemName.localeCompare(right.itemName);
                case 'itemNameDesc':
                    return right.itemName.localeCompare(left.itemName);
                case 'statusAsc':
                    return left.calibrationStatus.localeCompare(right.calibrationStatus) || left.assetNumber.localeCompare(right.assetNumber);
                case 'costDesc':
                    return Number(right.cost ?? 0) - Number(left.cost ?? 0);
                case 'costAsc':
                    return Number(left.cost ?? 0) - Number(right.cost ?? 0);
                case 'currentValueDesc':
                    return Number(right.currentValue ?? 0) - Number(left.currentValue ?? 0);
                case 'currentValueAsc':
                    return Number(left.currentValue ?? 0) - Number(right.currentValue ?? 0);
                case 'siteNameAsc':
                    return left.siteName.localeCompare(right.siteName) || left.assetNumber.localeCompare(right.assetNumber);
                case 'assetNumberAsc':
                default:
                    return left.assetNumber.localeCompare(right.assetNumber);
            }
        });
    }, [equipmentFilter, sortBy, statusFilter, visibleAssets]);
    const selectedSiteName = useMemo(() => {
        if (!selectedSiteId) {
            return 'All Locations';
        }
        return sites.find((site) => site.id === selectedSiteId)?.name ?? 'Selected Location';
    }, [selectedSiteId, sites]);
    const summary = useMemo(() => {
        return {
            total: filteredAssets.length,
            overdue: filteredAssets.filter((a) => a.calibrationStatus === 'overdue').length,
            dueSoon: filteredAssets.filter((a) => a.calibrationStatus === 'due_soon').length,
            underRepair: filteredAssets.filter((a) => a.damageStatus === 'under_repair').length,
            totalCost: filteredAssets.reduce((sum, a) => sum + Number(a.cost ?? 0), 0),
            currentValue: filteredAssets.reduce((sum, a) => sum + Number(a.currentValue ?? 0), 0),
        };
    }, [filteredAssets]);
    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [siteRows, assetRows] = await Promise.all([apiClient.getSites(), apiClient.getAssets()]);
            setSites(siteRows);
            setAssets(assetRows);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        void loadData();
    }, []);
    useEffect(() => {
        if (user.role === 'field_user') {
            setSelectedSiteId(user.siteId);
            return;
        }
        if (selectedSiteId && !sites.some((site) => site.id === selectedSiteId)) {
            setSelectedSiteId(null);
        }
    }, [selectedSiteId, sites, user.role, user.siteId]);
    useEffect(() => {
        return () => {
            if (deleteTimerRef.current) {
                clearTimeout(deleteTimerRef.current);
            }
        };
    }, []);
    useEffect(() => {
        if (!formOpen) {
            return;
        }
        formAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [formOpen, editing]);
    const handleSave = async (payload) => {
        if (editing) {
            await apiClient.updateAsset(editing.id, payload);
        }
        else {
            await apiClient.createAsset(payload);
        }
        setEditing(undefined);
        setFormOpen(false);
        await loadData();
    };
    const handleEdit = (asset) => {
        setEditing(asset);
        setFormOpen(true);
        setActionMessage(`Editing ${asset.assetNumber}`);
    };
    const requestDelete = (asset) => {
        setDeleteCandidate(asset);
        setActionMessage(null);
    };
    const confirmDelete = () => {
        if (!deleteCandidate) {
            return;
        }
        const asset = deleteCandidate;
        setDeleteCandidate(null);
        setPendingUndoDelete(asset);
        setAssets((current) => current.filter((item) => item.id !== asset.id));
        setActionMessage(`${asset.assetNumber} removed. Undo available for 5 seconds.`);
        if (deleteTimerRef.current) {
            clearTimeout(deleteTimerRef.current);
        }
        deleteTimerRef.current = setTimeout(() => {
            void apiClient.deleteAsset(asset.id).catch(async (err) => {
                setError(err instanceof Error ? err.message : 'Delete failed');
                await loadData();
            }).finally(() => {
                setPendingUndoDelete((current) => (current?.id === asset.id ? null : current));
                deleteTimerRef.current = null;
            });
        }, 5000);
    };
    const undoDelete = async () => {
        if (!pendingUndoDelete) {
            return;
        }
        if (deleteTimerRef.current) {
            clearTimeout(deleteTimerRef.current);
            deleteTimerRef.current = null;
        }
        setActionMessage(`${pendingUndoDelete.assetNumber} restored.`);
        setPendingUndoDelete(null);
        await loadData();
    };
    const handleScanLookup = async () => {
        try {
            setScanResult(await apiClient.scanAsset(scanInput));
        }
        catch (err) {
            setScanResult(null);
            alert(err instanceof Error ? err.message : 'Asset not found');
        }
    };
    return (_jsxs("main", { className: "layout", children: [_jsxs("header", { className: "topbar card", children: [_jsxs("div", { children: [_jsx("h1", { children: "FieldOps Dashboard" }), _jsxs("p", { children: [user.fullName, " (", user.role, ")"] }), _jsxs("p", { className: "subtle", children: ["Viewing: ", selectedSiteName] })] }), _jsx("button", { onClick: onLogout, children: "Sign Out" })] }), _jsxs("section", { className: "card location-nav", children: [_jsx("div", { className: "section-heading", children: _jsxs("div", { children: [_jsx("h3", { children: "Locations" }), _jsx("p", { children: "Break down workbook-backed assets by site." })] }) }), _jsxs("div", { className: "location-toolbar", children: [_jsxs("label", { className: "location-select", children: [_jsx("span", { children: "Search Sites" }), _jsx("input", { value: siteSearchTerm, onChange: (e) => setSiteSearchTerm(e.target.value), placeholder: "Search Sites" })] }), user.role !== 'field_user' && (_jsxs("label", { className: "location-select", children: [_jsx("span", { children: "Filter by Site" }), _jsxs("select", { value: selectedSiteId ?? '', onChange: (e) => setSelectedSiteId(e.target.value || null), children: [_jsxs("option", { value: "", children: ["All Locations (", assets.length, ")"] }), siteOptions.map((site) => (_jsxs("option", { value: site.id, children: [site.name, " (", siteCounts[site.id] ?? 0, ")"] }, site.id)))] })] })), _jsxs("label", { className: "location-select", children: [_jsx("span", { children: "Filter by Status" }), _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), children: [_jsx("option", { value: "all", children: "All" }), _jsx("option", { value: "overdue", children: "Overdue Calibration" }), _jsx("option", { value: "due_soon", children: "Due Soon" }), _jsx("option", { value: "warning", children: "Warning" }), _jsx("option", { value: "never_calibrated", children: "Never Calibrated" }), _jsx("option", { value: "under_repair", children: "Under Repair" }), _jsx("option", { value: "reported", children: "Reported Damage" }), _jsx("option", { value: "ok", children: "OK" })] })] }), _jsxs("label", { className: "location-select", children: [_jsx("span", { children: "Filter by Category" }), _jsxs("select", { value: equipmentFilter, onChange: (e) => setEquipmentFilter(e.target.value), children: [_jsx("option", { value: "all", children: "All" }), equipmentTypes.map((equipmentType) => (_jsx("option", { value: equipmentType, children: equipmentType }, equipmentType)))] })] })] }), _jsxs("div", { className: "location-meta", children: [_jsx("strong", { children: populatedSites.length }), _jsx("span", { children: "sites with workbook data" })] })] }), _jsxs("section", { className: "summary-grid", children: [_jsxs("article", { className: "card", children: [_jsx("h2", { children: summary.total }), _jsx("p", { children: "Total Assets" })] }), _jsxs("article", { className: "card", children: [_jsx("h2", { children: summary.overdue }), _jsx("p", { children: "Overdue Calibration" })] }), _jsxs("article", { className: "card", children: [_jsx("h2", { children: summary.dueSoon }), _jsx("p", { children: "Due Soon" })] }), _jsxs("article", { className: "card", children: [_jsx("h2", { children: summary.underRepair }), _jsx("p", { children: "Under Repair" })] }), _jsxs("article", { className: "card", children: [_jsxs("h2", { children: ["$", summary.totalCost.toLocaleString()] }), _jsx("p", { children: "Total Cost" })] }), _jsxs("article", { className: "card", children: [_jsxs("h2", { children: ["$", summary.currentValue.toLocaleString()] }), _jsx("p", { children: "Current Value" })] })] }), _jsxs("section", { className: "card scan-box", children: [_jsx("h3", { children: "Scan Lookup" }), _jsx("p", { children: "Manual fallback for barcode scanner workflow. Camera scan can be added using Html5-QRCode." }), _jsxs("div", { className: "inline-controls", children: [_jsx("input", { value: scanInput, onChange: (e) => setScanInput(e.target.value), placeholder: "Search Assets" }), _jsx("button", { onClick: () => void handleScanLookup(), children: "Lookup" })] }), scanResult && (_jsxs("p", { className: "scan-result", children: ["Found: ", _jsx("strong", { children: scanResult.assetNumber }), " - ", scanResult.itemName, " (", scanResult.siteName, ")"] }))] }), (user.role === 'admin' || user.role === 'field_user') && (_jsxs("section", { className: "actions card", children: [_jsx("button", { onClick: () => { setEditing(undefined); setFormOpen(true); }, children: "Add Asset" }), error && _jsx("p", { className: "error", children: error })] })), deleteCandidate && (_jsxs("section", { className: "card confirm-strip", children: [_jsxs("div", { children: [_jsx("h3", { children: "Delete Asset?" }), _jsxs("p", { children: ["Delete ", _jsx("strong", { children: deleteCandidate.assetNumber }), "? You will have 5 seconds to undo after confirming."] })] }), _jsxs("div", { className: "confirm-actions", children: [_jsx("button", { type: "button", className: "secondary-button", onClick: () => setDeleteCandidate(null), children: "Cancel" }), _jsx("button", { type: "button", className: "danger-button", onClick: confirmDelete, children: "Delete" })] })] })), pendingUndoDelete && !deleteCandidate && (_jsxs("section", { className: "card undo-strip", children: [_jsx("p", { children: actionMessage }), _jsx("button", { type: "button", className: "secondary-button", onClick: () => void undoDelete(), children: "Undo" })] })), actionMessage && !pendingUndoDelete && !deleteCandidate && (_jsx("section", { className: "card status-strip", children: _jsx("p", { children: actionMessage }) })), _jsx("section", { className: "card asset-toolbar", children: _jsxs("div", { className: "section-heading", children: [_jsxs("div", { children: [_jsx("h3", { children: "Assets" }), _jsxs("p", { children: [filteredAssets.length, " results in the current location view."] })] }), _jsxs("label", { className: "location-select", children: [_jsx("span", { children: "Sort Assets" }), _jsxs("select", { value: sortBy, onChange: (e) => setSortBy(e.target.value), children: [_jsx("option", { value: "assetNumberAsc", children: "Asset # A-Z" }), _jsx("option", { value: "assetNumberDesc", children: "Asset # Z-A" }), _jsx("option", { value: "itemNameAsc", children: "Item A-Z" }), _jsx("option", { value: "itemNameDesc", children: "Item Z-A" }), _jsx("option", { value: "statusAsc", children: "Status" }), _jsx("option", { value: "siteNameAsc", children: "Site A-Z" }), _jsx("option", { value: "costDesc", children: "Cost High-Low" }), _jsx("option", { value: "costAsc", children: "Cost Low-High" }), _jsx("option", { value: "currentValueDesc", children: "Current Value High-Low" }), _jsx("option", { value: "currentValueAsc", children: "Current Value Low-High" })] })] })] }) }), _jsx("div", { ref: formAnchorRef }), formOpen && (_jsx(AssetForm, { sites: sites, user: user, initial: editing, onSubmit: handleSave, onCancel: () => {
                    setFormOpen(false);
                    setEditing(undefined);
                } })), loading ? (_jsx("section", { className: "card", children: _jsx("p", { children: "Loading assets..." }) })) : (_jsx(AssetTable, { assets: filteredAssets, user: user, onEdit: handleEdit, onDelete: requestDelete }))] }));
};
