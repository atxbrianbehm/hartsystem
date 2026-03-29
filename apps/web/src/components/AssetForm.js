import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
const today = new Date().toISOString().slice(0, 10);
const toNullable = (value) => {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
};
export const AssetForm = ({ sites, user, initial, onSubmit, onCancel }) => {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const defaultSiteId = user.role === 'field_user' ? user.siteId ?? '' : sites[0]?.id ?? '';
    const [form, setForm] = useState({
        assetNumber: initial?.assetNumber ?? '',
        partNumber: initial?.partNumber ?? '',
        serialNumber: initial?.serialNumber ?? '',
        itemName: initial?.itemName ?? '',
        manufacturer: initial?.manufacturer ?? '',
        equipmentType: initial?.equipmentType ?? 'GNSS',
        siteId: initial?.siteId ?? defaultSiteId,
        ownership: initial?.ownership ?? 'unknown',
        assignedName: initial?.assignedName ?? '',
        employeeNumber: initial?.employeeNumber ?? '',
        vendor: initial?.vendor ?? '',
        firmwareVersion: initial?.firmwareVersion ?? '',
        latestFirmwareVersion: initial?.latestFirmwareVersion ?? '',
        subscriptionEndDate: initial?.subscriptionEndDate ?? '',
        lastCalibrationDate: initial?.lastCalibrationDate ?? '',
        calibrationIntervalDays: initial?.calibrationIntervalDays ?? 30,
        damageStatus: initial?.damageStatus ?? 'ok',
        damageType: initial?.damageType ?? '',
        assetNotes: initial?.assetNotes ?? '',
        repairNotes: initial?.repairNotes ?? '',
        estimatedRepairCost: initial?.estimatedRepairCost ?? 0,
        cost: initial?.cost ?? 0,
        replacementCost: initial?.replacementCost ?? 0,
        acquiredDate: initial?.acquiredDate ?? '',
    });
    const siteOptions = useMemo(() => {
        if (user.role === 'field_user') {
            return sites.filter((site) => site.id === user.siteId);
        }
        return sites;
    }, [sites, user.role, user.siteId]);
    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError(null);
        try {
            await onSubmit({
                assetNumber: form.assetNumber,
                partNumber: toNullable(form.partNumber),
                serialNumber: toNullable(form.serialNumber),
                itemName: form.itemName,
                manufacturer: toNullable(form.manufacturer),
                equipmentType: form.equipmentType,
                siteId: form.siteId,
                ownership: form.ownership,
                assignedName: toNullable(form.assignedName),
                employeeNumber: toNullable(form.employeeNumber),
                vendor: toNullable(form.vendor),
                firmwareVersion: toNullable(form.firmwareVersion),
                latestFirmwareVersion: toNullable(form.latestFirmwareVersion),
                subscriptionEndDate: toNullable(form.subscriptionEndDate),
                lastCalibrationDate: toNullable(form.lastCalibrationDate),
                calibrationIntervalDays: Number(form.calibrationIntervalDays),
                damageStatus: form.damageStatus,
                damageType: toNullable(form.damageType),
                assetNotes: toNullable(form.assetNotes),
                repairNotes: toNullable(form.repairNotes),
                estimatedRepairCost: Number(form.estimatedRepairCost),
                cost: Number(form.cost),
                replacementCost: Number(form.replacementCost),
                acquiredDate: toNullable(form.acquiredDate),
            });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save asset');
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("form", { className: "card form-grid", onSubmit: submit, children: [_jsx("h3", { children: initial ? 'Edit Asset' : 'Create Asset' }), error && _jsx("p", { className: "error", children: error }), _jsxs("label", { children: ["Asset Number", _jsx("input", { required: true, value: form.assetNumber, onChange: (e) => setForm({ ...form, assetNumber: e.target.value }) })] }), _jsxs("label", { children: ["Item Name", _jsx("input", { required: true, value: form.itemName, onChange: (e) => setForm({ ...form, itemName: e.target.value }) })] }), _jsxs("label", { children: ["Manufacturer", _jsx("input", { value: form.manufacturer, onChange: (e) => setForm({ ...form, manufacturer: e.target.value }) })] }), _jsxs("label", { children: ["Equipment Type", _jsx("input", { required: true, value: form.equipmentType, onChange: (e) => setForm({ ...form, equipmentType: e.target.value }) })] }), _jsxs("label", { children: ["Site", _jsx("select", { required: true, value: form.siteId, onChange: (e) => setForm({ ...form, siteId: e.target.value }), disabled: user.role === 'field_user', children: siteOptions.map((site) => _jsx("option", { value: site.id, children: site.name }, site.id)) })] }), _jsxs("label", { children: ["Ownership", _jsxs("select", { value: form.ownership, onChange: (e) => setForm({ ...form, ownership: e.target.value }), children: [_jsx("option", { value: "unknown", children: "Unknown" }), _jsx("option", { value: "owned", children: "Owned" }), _jsx("option", { value: "rental", children: "Rental" }), _jsx("option", { value: "rpo", children: "RPO" })] })] }), _jsxs("label", { children: ["Part Number", _jsx("input", { value: form.partNumber, onChange: (e) => setForm({ ...form, partNumber: e.target.value }) })] }), _jsxs("label", { children: ["Serial Number", _jsx("input", { value: form.serialNumber, onChange: (e) => setForm({ ...form, serialNumber: e.target.value }) })] }), _jsxs("label", { children: ["Firmware", _jsx("input", { maxLength: 128, value: form.firmwareVersion, onChange: (e) => setForm({ ...form, firmwareVersion: e.target.value }) })] }), _jsxs("label", { children: ["Latest Firmware", _jsx("input", { maxLength: 128, value: form.latestFirmwareVersion, onChange: (e) => setForm({ ...form, latestFirmwareVersion: e.target.value }) })] }), _jsxs("label", { children: ["Subscription End", _jsx("input", { type: "date", value: form.subscriptionEndDate, onChange: (e) => setForm({ ...form, subscriptionEndDate: e.target.value }) })] }), _jsxs("label", { children: ["Last Calibration", _jsx("input", { type: "date", value: form.lastCalibrationDate, onChange: (e) => setForm({ ...form, lastCalibrationDate: e.target.value }) })] }), _jsxs("label", { children: ["Calibration Interval Days", _jsx("input", { type: "number", min: 1, max: 365, value: form.calibrationIntervalDays, onChange: (e) => setForm({ ...form, calibrationIntervalDays: Number(e.target.value) }) })] }), _jsxs("label", { children: ["Damage Status", _jsxs("select", { value: form.damageStatus, onChange: (e) => setForm({ ...form, damageStatus: e.target.value }), children: [_jsx("option", { value: "ok", children: "OK" }), _jsx("option", { value: "reported", children: "Reported" }), _jsx("option", { value: "under_repair", children: "Under Repair" })] })] }), _jsxs("label", { children: ["Damage Type", _jsx("input", { value: form.damageType, onChange: (e) => setForm({ ...form, damageType: e.target.value }) })] }), _jsxs("label", { children: ["Asset Notes", _jsx("input", { value: form.assetNotes, onChange: (e) => setForm({ ...form, assetNotes: e.target.value }) })] }), _jsxs("label", { children: ["Repair Notes", _jsx("input", { value: form.repairNotes, onChange: (e) => setForm({ ...form, repairNotes: e.target.value }) })] }), _jsxs("label", { children: ["Cost", _jsx("input", { type: "number", min: 0, step: "0.01", value: form.cost, onChange: (e) => setForm({ ...form, cost: Number(e.target.value) }) })] }), _jsxs("label", { children: ["Replacement Cost", _jsx("input", { type: "number", min: 0, step: "0.01", value: form.replacementCost, onChange: (e) => setForm({ ...form, replacementCost: Number(e.target.value) }) })] }), _jsxs("label", { children: ["Estimated Repair Cost", _jsx("input", { type: "number", min: 0, step: "0.01", value: form.estimatedRepairCost, onChange: (e) => setForm({ ...form, estimatedRepairCost: Number(e.target.value) }) })] }), _jsxs("label", { children: ["Acquired Date", _jsx("input", { type: "date", value: form.acquiredDate, onChange: (e) => setForm({ ...form, acquiredDate: e.target.value }) })] }), _jsxs("div", { className: "actions", children: [_jsx("button", { type: "button", onClick: onCancel, children: "Cancel" }), _jsx("button", { type: "submit", disabled: saving, children: saving ? 'Saving...' : 'Save Asset' })] })] }));
};
