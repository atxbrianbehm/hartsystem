<GlobalFunctions>
  <State
    id="equipmentData"
    value={include("./data/sampleEquipmentData.json", "string")}
  />
  <State
    id="siteCatalog"
    value={include("./data/sampleSiteCatalog.json", "string")}
  />
  <State
    id="currentUser"
    value={
      '{"userName": "Sample Armadillo User", "employeeNumber": "0000000000", "siteName": "armadillo", "siteLabel": "Armadillo", "role": "site_user"}'
    }
  />
</GlobalFunctions>
