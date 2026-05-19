window.CARRIER_RULES = {
  carriers: [
    { name: 'LAVA Preferred Mutual', appetite: 'Clean risks, strong prior insurance, preferred coverage limits', baseAuto: 1180, baseHome: 1425 },
    { name: 'Harbor Standard Insurance', appetite: 'Standard market with flexible underwriting', baseAuto: 1320, baseHome: 1575 },
    { name: 'Summit Select Casualty', appetite: 'Higher limits, bundled accounts, stable payment history', baseAuto: 1450, baseHome: 1680 },
    { name: 'Pioneer Specialty Risk', appetite: 'Referral market for unusual exposures', baseAuto: 1710, baseHome: 1960 },
    { name: 'Shield Nonstandard Program', appetite: 'Lapse, SR-22, higher violation risks subject to review', baseAuto: 2050, baseHome: 2280 }
  ],
  endorsementRequirements: {
    'Add Driver': ['Full driver name', 'Date of birth', 'License number/state', 'Years licensed', 'MVR/violations', 'Driver assignment and usage'],
    'Remove Driver': ['Driver name', 'Reason for removal', 'Proof of other insurance or residency if required', 'Excluded driver form if applicable'],
    'Add Vehicle': ['VIN', 'Year/make/model', 'Garaging address', 'Ownership/lienholder', 'Coverage selection', 'Photos or inspection if required'],
    'Remove Vehicle': ['Vehicle removed', 'Reason', 'Plate surrender or proof sold if required', 'Confirm remaining vehicles and drivers'],
    'Change Address': ['Old address', 'New mailing and garaging/risk address', 'Effective date', 'Rating territory impact', 'Mortgagee/lienholder update if needed'],
    'Coverage Change': ['Current coverage', 'Requested coverage', 'Effective date', 'Premium impact', 'Signed rejection/selection forms if required'],
    'Add Mortgagee / Loss Payee': ['Mortgagee/loss payee full name', 'Loan number', 'Mailing address', 'Clause type', 'Effective date'],
    'Add Lienholder': ['Lienholder name', 'Loan/lease number', 'Address', 'Vehicle VIN', 'Comprehensive/collision required'],
    'Correct Named Insured': ['Current name', 'Correct legal name', 'Reason for correction', 'Supporting ID/business document', 'Signature if required']
  },
  requiredQuoteFields: {
    shared: ['product','insuredName','effectiveDate','continuousInsurance','currentlyInsured','documentsReceived','paymentReady'],
    Auto: ['autoGaragingAddress','vin','vehicleYear','vehicleMake','vehicleModel','driverName','yearsLicensed','violations','biLimit','pdLimit','compDed','collDed'],
    Home: ['propertyAddress','occupancy','yearBuilt','squareFeet','construction','roofYear','roofType','coverageA','liability','aopDed']
  }
};
