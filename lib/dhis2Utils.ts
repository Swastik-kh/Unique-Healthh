import { OrganizationSettings, DHIS2CellMapping } from '../types/coreTypes';

export const getDhis2CellMapping = (
  sourceKey: string, 
  settings: OrganizationSettings, 
  defaults: { dataElement: string; categoryOptionCombo: string }
): { dataElement: string; categoryOptionCombo: string } => {
  const mapping = settings.dhis2CellMappings?.find(m => m.sourceKey.toLowerCase() === sourceKey.toLowerCase());
  
  if (mapping && mapping.dataElement) {
    return {
      dataElement: mapping.dataElement,
      categoryOptionCombo: mapping.categoryOptionCombo || defaults.categoryOptionCombo
    };
  }
  
  return defaults;
};
