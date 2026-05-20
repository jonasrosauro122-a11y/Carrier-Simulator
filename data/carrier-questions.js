window.CARRIER_REFERENCE = {
  states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],
  autoLiabilityLimits: ["State Minimum", "50/100/50", "100/300/100", "250/500/100", "500/500/250"],
  homeCoverageA: ["150000","200000","250000","300000","400000","500000","750000","1000000"],
  deductibles: ["500","1000","1500","2500","5000"],
  endorsementTypes: ["Add Driver", "Remove Driver", "Add Vehicle", "Remove Vehicle", "Address Change", "Mortgagee/Lienholder Change", "Coverage Change", "Named Insured Change", "Add Additional Interest", "Other"],
  cancellationReasons: ["Insured Request", "Non-Payment", "Rewritten/Replaced Coverage", "Sold Property/Vehicle", "Duplicate Coverage", "Underwriting Request", "Other"]
};

window.QUOTE_SCHEMAS = {
  auto: {
    title: "Personal Auto New Business Quote",
    sections: [
      {
        title: "Account Setup",
        fields: [
          {name:"effective_date", label:"Requested Effective Date", type:"date", required:true},
          {name:"line_of_business", label:"Line of Business", type:"select", options:["Personal Auto"], required:true},
          {name:"producer_code", label:"Producer / Agency Code", type:"text", placeholder:"Example: LAVA-001", required:true},
          {name:"quote_state", label:"Quote State", type:"select", options:window.CARRIER_REFERENCE.states, required:true}
        ]
      },
      {
        title: "Named Insured",
        fields: [
          {name:"insured_first", label:"First Name", type:"text", required:true},
          {name:"insured_last", label:"Last Name", type:"text", required:true},
          {name:"email", label:"Email Address", type:"email", required:true},
          {name:"phone", label:"Phone Number", type:"tel", required:true},
          {name:"dob", label:"Date of Birth", type:"date", required:true},
          {name:"marital_status", label:"Marital Status", type:"select", options:["Single","Married","Domestic Partner","Divorced","Widowed"], required:true}
        ]
      },
      {
        title: "Mailing and Garaging Address",
        fields: [
          {name:"mailing_address", label:"Mailing Street Address", type:"text", required:true},
          {name:"mailing_city", label:"Mailing City", type:"text", required:true},
          {name:"mailing_state", label:"Mailing State", type:"select", options:window.CARRIER_REFERENCE.states, required:true},
          {name:"mailing_zip", label:"Mailing ZIP", type:"text", required:true},
          {name:"garaging_same", label:"Garaging same as mailing?", type:"select", options:["Yes","No"], required:true},
          {name:"garaging_zip", label:"Garaging ZIP", type:"text", required:true}
        ]
      },
      {
        title: "Prior Insurance",
        fields: [
          {name:"prior_carrier", label:"Prior Carrier", type:"text", required:true},
          {name:"prior_policy_number", label:"Prior Policy Number", type:"text"},
          {name:"prior_expiration", label:"Prior Policy Expiration", type:"date", required:true},
          {name:"continuous_months", label:"Continuous Insurance Months", type:"number", required:true},
          {name:"prior_limits", label:"Prior Liability Limits", type:"select", options:window.CARRIER_REFERENCE.autoLiabilityLimits, required:true},
          {name:"lapse_days", label:"Any Lapse? Enter number of days", type:"number", required:true}
        ]
      },
      {
        title: "Vehicle Information",
        fields: [
          {name:"vehicle_year", label:"Vehicle Year", type:"number", required:true},
          {name:"vehicle_make", label:"Make", type:"text", required:true},
          {name:"vehicle_model", label:"Model", type:"text", required:true},
          {name:"vin", label:"VIN", type:"text", required:true},
          {name:"ownership", label:"Ownership", type:"select", options:["Owned","Financed","Leased"], required:true},
          {name:"vehicle_use", label:"Primary Use", type:"select", options:["Pleasure","Commute","Business","Farm","Rideshare/Delivery"], required:true},
          {name:"annual_miles", label:"Annual Mileage", type:"number", required:true},
          {name:"commute_miles", label:"One-way Commute Miles", type:"number", required:true}
        ]
      },
      {
        title: "Driver and Household",
        fields: [
          {name:"driver_license", label:"Driver License Number", type:"text", required:true},
          {name:"license_state", label:"License State", type:"select", options:window.CARRIER_REFERENCE.states, required:true},
          {name:"license_status", label:"License Status", type:"select", options:["Valid","Suspended","Expired","Permit","Foreign License"], required:true},
          {name:"years_licensed", label:"Years Licensed", type:"number", required:true},
          {name:"accidents_5yrs", label:"At-fault Accidents Last 5 Years", type:"number", required:true},
          {name:"violations_5yrs", label:"Moving Violations Last 5 Years", type:"number", required:true},
          {name:"household_drivers", label:"Number of Household Drivers", type:"number", required:true},
          {name:"excluded_driver", label:"Any excluded driver requested?", type:"select", options:["No","Yes"], required:true}
        ]
      },
      {
        title: "Coverage Selection",
        fields: [
          {name:"liability_limits", label:"Liability Limits", type:"select", options:window.CARRIER_REFERENCE.autoLiabilityLimits, required:true},
          {name:"um_uim", label:"UM/UIM Coverage", type:"select", options:["Reject","State Minimum","Match BI Limits"], required:true},
          {name:"medical", label:"Medical Payments / PIP", type:"select", options:["Reject","1000","5000","10000","25000"], required:true},
          {name:"comp_deductible", label:"Comprehensive Deductible", type:"select", options:window.CARRIER_REFERENCE.deductibles, required:true},
          {name:"collision_deductible", label:"Collision Deductible", type:"select", options:window.CARRIER_REFERENCE.deductibles, required:true},
          {name:"rental", label:"Rental Reimbursement", type:"select", options:["No","30/900","40/1200","50/1500"], required:true},
          {name:"roadside", label:"Roadside Assistance", type:"select", options:["No","Yes"], required:true}
        ]
      },
      {
        title: "Carrier Underwriting Questions",
        fields: [
          {name:"sr22", label:"SR-22 / FR-44 filing needed?", type:"select", options:["No","Yes"], required:true},
          {name:"salvage", label:"Any salvage/rebuilt/custom vehicle?", type:"select", options:["No","Yes"], required:true},
          {name:"business_delivery", label:"Vehicle used for rideshare, delivery, livery, or commercial hauling?", type:"select", options:["No","Yes"], required:true},
          {name:"out_of_state", label:"Vehicle garaged out of state more than 30 days?", type:"select", options:["No","Yes"], required:true},
          {name:"unlisted_household", label:"Any unlisted household members age 14+?", type:"select", options:["No","Yes"], required:true},
          {name:"documents_ready", label:"Required documents ready? Prior dec page, registration, driver license", type:"select", options:["Yes","No"], required:true}
        ]
      }
    ]
  },
  home: {
    title: "Homeowners New Business Quote",
    sections: [
      {
        title: "Account Setup",
        fields: [
          {name:"effective_date", label:"Requested Effective Date", type:"date", required:true},
          {name:"line_of_business", label:"Line of Business", type:"select", options:["Homeowners HO3","Condo HO6","Renters HO4"], required:true},
          {name:"producer_code", label:"Producer / Agency Code", type:"text", placeholder:"Example: LAVA-001", required:true},
          {name:"quote_state", label:"Property State", type:"select", options:window.CARRIER_REFERENCE.states, required:true}
        ]
      },
      {
        title: "Named Insured",
        fields: [
          {name:"insured_first", label:"First Name", type:"text", required:true},
          {name:"insured_last", label:"Last Name", type:"text", required:true},
          {name:"email", label:"Email Address", type:"email", required:true},
          {name:"phone", label:"Phone Number", type:"tel", required:true},
          {name:"dob", label:"Date of Birth", type:"date", required:true},
          {name:"marital_status", label:"Marital Status", type:"select", options:["Single","Married","Domestic Partner","Divorced","Widowed"], required:true}
        ]
      },
      {
        title: "Property Location",
        fields: [
          {name:"property_address", label:"Property Street Address", type:"text", required:true},
          {name:"property_city", label:"Property City", type:"text", required:true},
          {name:"property_state", label:"Property State", type:"select", options:window.CARRIER_REFERENCE.states, required:true},
          {name:"property_zip", label:"Property ZIP", type:"text", required:true},
          {name:"occupancy", label:"Occupancy", type:"select", options:["Primary Residence","Secondary Residence","Seasonal","Tenant Occupied","Vacant"], required:true},
          {name:"purchase_date", label:"Purchase Date", type:"date"}
        ]
      },
      {
        title: "Property Characteristics",
        fields: [
          {name:"year_built", label:"Year Built", type:"number", required:true},
          {name:"square_feet", label:"Square Feet", type:"number", required:true},
          {name:"stories", label:"Number of Stories", type:"select", options:["1","1.5","2","3+"], required:true},
          {name:"construction", label:"Construction Type", type:"select", options:["Frame","Masonry","Brick Veneer","Concrete","Manufactured/Mobile"], required:true},
          {name:"roof_year", label:"Roof Year", type:"number", required:true},
          {name:"roof_material", label:"Roof Material", type:"select", options:["Architectural Shingle","3-tab Shingle","Metal","Tile","Slate","Wood Shake","Flat/Rolled"], required:true},
          {name:"heating", label:"Primary Heating", type:"select", options:["Central HVAC","Electric","Gas Furnace","Heat Pump","Wood Stove","Oil"], required:true},
          {name:"plumbing_updated", label:"Plumbing Updated?", type:"select", options:["Yes","No","Partial"], required:true}
        ]
      },
      {
        title: "Protection and Claims",
        fields: [
          {name:"prior_carrier", label:"Prior Home Carrier", type:"text", required:true},
          {name:"prior_expiration", label:"Prior Policy Expiration", type:"date", required:true},
          {name:"claims_5yrs", label:"Number of Property Claims Last 5 Years", type:"number", required:true},
          {name:"claim_details", label:"Claim Details if any", type:"textarea"},
          {name:"fire_hydrant", label:"Distance to Fire Hydrant", type:"select", options:["Less than 1000 ft","1000 ft - 1 mile","1 - 5 miles","Over 5 miles"], required:true},
          {name:"fire_station", label:"Distance to Fire Station", type:"select", options:["Less than 1 mile","1 - 5 miles","Over 5 miles"], required:true}
        ]
      },
      {
        title: "Coverage Selection",
        fields: [
          {name:"coverage_a", label:"Dwelling Coverage A", type:"select", options:window.CARRIER_REFERENCE.homeCoverageA, required:true},
          {name:"deductible", label:"All Other Perils Deductible", type:"select", options:window.CARRIER_REFERENCE.deductibles, required:true},
          {name:"wind_hail", label:"Wind/Hail Deductible", type:"select", options:["Included","1%","2%","5%","Excluded"], required:true},
          {name:"liability", label:"Personal Liability", type:"select", options:["100000","300000","500000","1000000"], required:true},
          {name:"medical", label:"Medical Payments", type:"select", options:["1000","5000","10000"], required:true},
          {name:"water_backup", label:"Water Backup", type:"select", options:["No","5000","10000","25000","50000"], required:true},
          {name:"replacement_cost", label:"Personal Property Replacement Cost", type:"select", options:["Yes","No"], required:true}
        ]
      },
      {
        title: "Risk and Underwriting Questions",
        fields: [
          {name:"pool", label:"Swimming pool?", type:"select", options:["No","Yes - fenced","Yes - unfenced"], required:true},
          {name:"trampoline", label:"Trampoline?", type:"select", options:["No","Yes"], required:true},
          {name:"dogs", label:"Dogs or animals with bite history?", type:"select", options:["No","Yes"], required:true},
          {name:"business", label:"Business conducted on premises?", type:"select", options:["No","Yes"], required:true},
          {name:"short_term_rental", label:"Short-term rental/Airbnb exposure?", type:"select", options:["No","Yes"], required:true},
          {name:"vacant", label:"Vacant or under renovation?", type:"select", options:["No","Yes"], required:true},
          {name:"brushfire", label:"Brushfire/wildfire exposure or less than 500 ft from brush?", type:"select", options:["No","Yes"], required:true},
          {name:"mortgagee", label:"Mortgagee / Loss Payee Name", type:"text"}
        ]
      }
    ]
  }
};
