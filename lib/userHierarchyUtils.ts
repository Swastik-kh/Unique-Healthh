import { User } from '../types/coreTypes';

/**
 * Standard priority weight for roles when determining default hierarchy order
 */
export const getRoleRankWeight = (role?: string): number => {
  switch (role) {
    case 'SUPER_ADMIN': return 1;
    case 'ADMIN': return 2;
    case 'HEALTH_SECTION': return 3;
    case 'DOCTOR': return 4;
    case 'OFFICER': return 5;
    case 'ACCOUNTANT': return 6;
    case 'PHARMACY': return 7;
    case 'LAB': return 8;
    case 'NURSE': return 9;
    case 'AHW': return 10;
    case 'ANM': return 11;
    case 'DRIVER': return 15;
    case 'USER': return 12;
    default: return 20;
  }
};

/**
 * Extract level number from designation or level string (e.g. "एघारौं" -> 11, "१० औं" -> 10, "सातौं" -> 7)
 */
export const getDesignationLevelWeight = (designation?: string, level?: string): number => {
  const text = `${designation || ''} ${level || ''}`.toLowerCase();
  if (text.includes('अधिकृत बाह्रौं') || text.includes('१२ औं') || text.includes('बाह्रौं')) return 12;
  if (text.includes('अधिकृत एघारौं') || text.includes('११ औं') || text.includes('एघारौं')) return 11;
  if (text.includes('अधिकृत दशौं') || text.includes('१० औं') || text.includes('दशौं')) return 10;
  if (text.includes('अधिकृत नवौं') || text.includes('९ औं') || text.includes('नवौं')) return 9;
  if (text.includes('अधिकृत आठौं') || text.includes('८ औं') || text.includes('आठौं')) return 8;
  if (text.includes('अधिकृत सातौं') || text.includes('७ औं') || text.includes('सातौं')) return 7;
  if (text.includes('सहायक पाँचौं') || text.includes('५ औं') || text.includes('पाँचौं')) return 5;
  if (text.includes('सहायक चौथो') || text.includes('४ थौ') || text.includes('चौथो') || text.includes('चौथा')) return 4;
  if (text.includes('सहायक तेस्रो') || text.includes('३ रा') || text.includes('तेस्रो')) return 3;
  if (text.includes('श्रेणीविहीन') || text.includes('कार्यालय सहयोगी')) return 1;
  return 0;
};

/**
 * Sorts users according to the configured hierarchy order.
 * If user IDs are listed in hierarchyOrder, they appear in that exact order (index 0, 1, 2...).
 * Users not in hierarchyOrder are sorted gracefully by Role, Level, and Name at the end.
 */
export const sortUsersByHierarchy = (users: User[], hierarchyOrder?: string[]): User[] => {
  if (!users || users.length === 0) return [];
  const list = [...users];

  const orderMap = new Map<string, number>();
  if (hierarchyOrder && Array.isArray(hierarchyOrder) && hierarchyOrder.length > 0) {
    hierarchyOrder.forEach((id, index) => {
      if (id) orderMap.set(id, index);
    });
  }

  return list.sort((a, b) => {
    const hasA = orderMap.has(a.id);
    const hasB = orderMap.has(b.id);

    if (hasA && hasB) {
      return (orderMap.get(a.id)!) - (orderMap.get(b.id)!);
    }
    if (hasA) return -1;
    if (hasB) return 1;

    // Fallback sort: Role rank weight
    const roleRankA = getRoleRankWeight(a.role);
    const roleRankB = getRoleRankWeight(b.role);
    if (roleRankA !== roleRankB) {
      return roleRankA - roleRankB;
    }

    // Level weight (higher level first)
    const levelA = getDesignationLevelWeight(a.designation);
    const levelB = getDesignationLevelWeight(b.designation);
    if (levelA !== levelB) {
      return levelB - levelA;
    }

    // Name alphabetical
    return (a.fullName || a.username || '').localeCompare(b.fullName || b.username || '', 'ne');
  });
};

/**
 * Computes a smart default hierarchy order (array of user IDs)
 */
export const getDefaultHierarchyOrder = (users: User[]): string[] => {
  const sorted = sortUsersByHierarchy(users, []);
  return sorted.map(u => u.id).filter(Boolean);
};
