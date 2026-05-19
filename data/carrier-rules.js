window.CARRIER_RULES = {
  trainerCode: 'LAVA2026',
  carriers: [
    { name: 'Preferred Mutual Training', tier: 'Preferred', autoBase: 1180, homeBase: 1320, appetite: 'Clean risks, continuous prior insurance, standard coverages' },
    { name: 'ShieldPoint Training', tier: 'Standard', autoBase: 1420, homeBase: 1590, appetite: 'Average risks, minor violations, standard property updates' },
    { name: 'Summit Casualty Training', tier: 'Referral', autoBase: 1760, homeBase: 1980, appetite: 'Mixed risks requiring underwriting review' },
    { name: 'Harbor Specialty Training', tier: 'Non-Standard', autoBase: 2350, homeBase: 2510, appetite: 'Higher risk or specialty placement' }
  ],
  quoteSteps: {
    auto: [
      { key: 'account', label: 'Account Setup' },
      { key: 'insured', label: 'Named Insured' },
      { key: 'address', label: 'Addresses' },
      { key: 'prior', label: 'Prior Insurance' },
      { key: 'drivers', label: 'Drivers' },
      { key: 'vehicles', label: 'Vehicles' },
      { key: 'coverage', label: 'Coverage' },
      { key: 'uw', label: 'Underwriting' },
      { key: 'review', label: 'Review & Rate' }
    ],
    home: [
      { key: 'account', label: 'Account Setup' },
      { key: 'insured', label: 'Named Insured' },
      { key: 'property', label: 'Property' },
      { key: 'construction', label: 'Construction' },
      { key: 'prior', label: 'Prior Insurance' },
      { key: 'coverage', label: 'Coverage' },
      { key: 'hazards', label: 'Risk Hazards' },
      { key: 'uw', label: 'Underwriting' },
      { key: 'review', label: 'Review & Rate' }
    ]
  },
  autoCoverages: {
    bodilyInjury: ['25/50', '50/100', '100/300', '250/500', '500 CSL'],
    propertyDamage: ['25,000', '50,000', '100,000', '250,000'],
    uninsuredMotorist: ['Reject', '25/50', '50/100', '100/300', '250/500'],
    medPay: ['Reject', '1,000', '2,000', '5,000', '10,000'],
    deductibles: ['250', '500', '1,000', '2,500']
  },
  homeCoverages: {
    dwelling: ['150000', '200000', '250000', '300000', '400000', '500000', '750000', '1000000'],
    liability: ['100000', '300000', '500000', '1000000'],
    deductible: ['500', '1000', '2500', '5000', '1% Wind/Hail', '2% Wind/Hail']
  },
  states: ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VA','VT','WA','WI','WV','WY']
};
