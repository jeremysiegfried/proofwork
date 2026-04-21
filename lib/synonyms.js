// Search synonyms - when user searches X, also search for related terms
// This dramatically increases result quality

var SEARCH_SYNONYMS = {
  'ecommerce': ['e-commerce', 'ecommerce', 'shopify', 'magento', 'woocommerce', 'marketplace', 'online retail', 'online sales', 'digital commerce', 'amazon seller', 'ebay'],
  'e-commerce': ['e-commerce', 'ecommerce', 'shopify', 'magento', 'woocommerce', 'marketplace', 'online retail', 'online sales', 'digital commerce'],
  'developer': ['developer', 'engineer', 'programmer', 'coder'],
  'engineer': ['engineer', 'developer', 'programmer'],
  'marketing': ['marketing', 'digital marketing', 'content', 'seo', 'social media', 'brand', 'growth', 'ppc', 'email marketing'],
  'sales': ['sales', 'account executive', 'business development', 'bdm', 'bdr', 'sdr', 'commercial'],
  'design': ['designer', 'ux', 'ui', 'graphic design', 'visual design', 'product design', 'creative'],
  'designer': ['designer', 'ux', 'ui', 'graphic design', 'visual design', 'product design', 'creative'],
  'data': ['data', 'analytics', 'bi', 'business intelligence', 'insights', 'reporting'],
  'hr': ['hr', 'human resources', 'people', 'talent', 'recruitment', 'resourcing'],
  'finance': ['finance', 'accounting', 'accountant', 'financial', 'audit', 'treasury', 'fp&a'],
  'admin': ['admin', 'administrator', 'office', 'receptionist', 'pa', 'secretary', 'executive assistant'],
  'it': ['it', 'information technology', 'tech support', 'helpdesk', 'desktop support', 'network'],
  'nurse': ['nurse', 'nursing', 'clinical', 'healthcare', 'nhs', 'ward', 'staff nurse'],
  'teacher': ['teacher', 'teaching', 'education', 'school', 'tutor', 'lecturer', 'sen'],
  'chef': ['chef', 'cook', 'kitchen', 'sous chef', 'head chef', 'catering', 'pastry'],
  'driver': ['driver', 'hgv', 'lgv', 'van driver', 'delivery', 'courier', 'transport'],
  'warehouse': ['warehouse', 'picker', 'packer', 'forklift', 'logistics', 'distribution'],
  'construction': ['construction', 'building', 'site', 'labourer', 'builder', 'groundwork'],
  'legal': ['legal', 'solicitor', 'lawyer', 'paralegal', 'barrister', 'conveyancing'],
  'property': ['property', 'estate agent', 'lettings', 'surveyor', 'real estate'],
  'retail': ['retail', 'store', 'shop', 'merchandising', 'fashion', 'beauty'],
  'care': ['care', 'carer', 'support worker', 'care assistant', 'domiciliary', 'residential'],
  'security': ['security', 'cctv', 'door supervisor', 'sia'],
  'cleaning': ['cleaning', 'cleaner', 'housekeeping', 'janitor', 'facilities'],
  'software': ['software', 'developer', 'engineer', 'programmer', 'full stack', 'frontend', 'backend'],
  'project manager': ['project manager', 'programme manager', 'pmo', 'delivery manager'],
  'product manager': ['product manager', 'product owner', 'product lead'],
  'customer service': ['customer service', 'call centre', 'contact centre', 'helpdesk', 'complaints', 'support'],
  'receptionist': ['receptionist', 'front desk', 'front of house', 'administrator'],
  'accountant': ['accountant', 'accounting', 'bookkeeper', 'accounts', 'finance'],
  'electrician': ['electrician', 'electrical', 'sparky', 'wiring'],
  'plumber': ['plumber', 'plumbing', 'heating', 'gas engineer'],
}

export function expandSearch(query) {
  if (!query) return []
  var lower = query.toLowerCase().trim()
  
  // Check for exact synonym match
  if (SEARCH_SYNONYMS[lower]) {
    return SEARCH_SYNONYMS[lower]
  }
  
  // Check for partial match
  for (var key in SEARCH_SYNONYMS) {
    if (lower.includes(key) || key.includes(lower)) {
      return SEARCH_SYNONYMS[key]
    }
  }
  
  // No synonyms found, return original
  return [lower]
}
