import fs from 'fs';
let content = fs.readFileSync('components/SujhabPetika.tsx', 'utf-8');

// Update allOrganizations calculation
const oldCalculation = `  const allOrganizations = Array.from(new Set(users?.map(u => u.organizationName).filter(Boolean))).sort();`;
const newCalculation = `  const allOrganizations = useMemo(() => {
    return Array.from(new Set(
      users?.filter(u => u.allowedMenus?.includes('sujhab_petika'))
            .map(u => u.organizationName)
            .filter(Boolean)
    )).sort();
  }, [users]);`;

content = content.replace(oldCalculation, newCalculation);

// Add useMemo to imports if not there
if (!content.includes('useMemo')) {
    content = content.replace("import React, { useEffect, useState } from 'react';", "import React, { useEffect, useState, useMemo } from 'react';");
}

fs.writeFileSync('components/SujhabPetika.tsx', content);
