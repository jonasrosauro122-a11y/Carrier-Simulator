window.CARRIER_DATA = {
  carriers: [
    {
      name: 'Travelers', code: 'TRV', tier: 'Preferred / Standard', autoFactor: 1.02, homeFactor: 1.04,
      strengths: ['Clean prior insurance history', 'Multi-policy households', 'Modern homes with protective devices'],
      cautions: ['Major violations', 'Lapse over 30 days', 'Older roofs without updates'],
      appetite: { auto: 'Preferred drivers with stable insurance history and standard personal use.', home: 'Well-maintained primary residences with updated roof, plumbing, electrical, and heating.' }
    },
    {
      name: 'Safeco', code: 'SAF', tier: 'Standard / Preferred', autoFactor: 0.98, homeFactor: 1.08,
      strengths: ['Package opportunities', 'Good student and telematics discounts', 'Mid-market households'],
      cautions: ['Business use exposure', 'Prior lapse', 'Multiple claim frequency'],
      appetite: { auto: 'Standard to preferred personal auto with good household driver controls.', home: 'Primary homes with acceptable claim history and routine maintenance.' }
    },
    {
      name: 'Progressive', code: 'PROG', tier: 'Broad Market', autoFactor: 0.94, homeFactor: 1.15,
      strengths: ['Broad auto appetite', 'Prior lapse tolerance', 'Flexible payment options'],
      cautions: ['Delivery/rideshare exposure', 'Household driver mismatch', 'Severe violations'],
      appetite: { auto: 'Broad market auto quoting with strong emphasis on accurate driver and vehicle disclosure.', home: 'Selective homeowners placement, usually strongest when bundled with auto.' }
    },
    {
      name: 'Mercury', code: 'MER', tier: 'Standard', autoFactor: 1.07, homeFactor: 1.02,
      strengths: ['California-style personal lines training', 'Stable households', 'Clean loss history'],
      cautions: ['High value or unusual risks', 'Unverified drivers', 'Older properties'],
      appetite: { auto: 'Standard personal auto with verified household drivers and acceptable MVR.', home: 'Owner-occupied properties with controlled hazard profile.' }
    },
    {
      name: 'Bamboo', code: 'BAM', tier: 'Home Focus', autoFactor: 1.22, homeFactor: 0.96,
      strengths: ['Home-focused placement', 'Good for clean occupancy risks', 'Modern construction details'],
      cautions: ['Vacant properties', 'Business on premises', 'Unrepaired hazards'],
      appetite: { auto: 'Auto is shown for comparison training only; not a primary market in this simulator.', home: 'Homeowners risks with clear occupancy, roof details, and no unresolved hazard concerns.' }
    },
    {
      name: 'Erie', code: 'ERI', tier: 'Preferred Regional', autoFactor: 0.97, homeFactor: 0.99,
      strengths: ['Preferred households', 'Low claim frequency', 'Stable coverage limits'],
      cautions: ['Geographic availability', 'Lapsed coverage', 'High-risk driving activity'],
      appetite: { auto: 'Preferred to standard drivers with continuous insurance and low violation activity.', home: 'Quality homes with updated systems and favorable protection class.' }
    },
    {
      name: 'National General', code: 'NGIC', tier: 'Non-Standard / Standard', autoFactor: 1.14, homeFactor: 1.20,
      strengths: ['Non-standard auto options', 'SR-22 style training scenarios', 'Flexible risk review'],
      cautions: ['Premium can be higher', 'Underwriting documentation needed', 'Payment plan sensitivity'],
      appetite: { auto: 'Standard and non-standard auto training cases with clear disclosure of driver history.', home: 'May consider risks needing additional underwriting review and documentation.' }
    }
  ],
  states: ['AL','AZ','CA','CO','FL','GA','IL','IN','MD','MI','NC','NV','OH','OR','PA','SC','TN','TX','VA','WA'],
  agencies: ['LAVA Training Agency', 'South City Insurance', 'Steel Insurance', 'Broad Market Training Desk'],
  producerCodes: ['PL-TRAIN-001', 'AUTO-VA-101', 'HOME-VA-201', 'NEWBIZ-330'],
  bodyStyles: ['Sedan','SUV','Truck','Van','Coupe','Wagon','Crossover'],
  homeTypes: ['Single Family','Townhouse','Condo','Duplex','Manufactured Home'],
  roofTypes: ['Composition Shingle','Tile','Metal','Slate','Wood Shake','Flat / Built-up'],
  constructionTypes: ['Frame','Masonry','Masonry Veneer','Superior / Fire Resistive','Manufactured'],
  yesNo: ['No','Yes']
};
