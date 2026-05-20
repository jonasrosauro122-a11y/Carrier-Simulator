/*
  Expanded realistic carrier-style quote questions for training.
  This file is intentionally standalone and does not require npm/build tools.
*/

window.CARRIER_REFERENCE = {
  states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],
  autoLiabilityLimits: ["State Minimum", "25/50/25", "50/100/50", "100/300/50", "100/300/100", "250/500/100", "500/500/250", "500 CSL", "1M CSL"],
  homeCoverageA: ["150000","175000","200000","250000","300000","350000","400000","450000","500000","600000","750000","1000000","1250000","1500000"],
  deductibles: ["250","500","1000","1500","2500","5000","10000"],
  percentDeductibles: ["Included","0.5%","1%","2%","3%","5%","Excluded"],
  autoCompCollisionDeductibles: ["0","100","250","500","750","1000","1500","2500"],
  endorsementTypes: ["Add Driver", "Remove Driver", "Add Vehicle", "Remove Vehicle", "Replace Vehicle", "Address Change", "Mortgagee/Lienholder Change", "Coverage Change", "Named Insured Change", "Add Additional Interest", "Add Loss Payee", "Driver Exclusion", "Discount Update", "Other"],
  cancellationReasons: ["Insured Request", "Non-Payment", "Rewritten/Replaced Coverage", "Sold Property/Vehicle", "Duplicate Coverage", "Underwriting Request", "Moved Out of State", "Other"],
  relationshipOptions: ["Named Insured","Spouse","Domestic Partner","Child","Parent","Sibling","Roommate","Employee","Other"],
  carrierTiers: ["Preferred", "Standard", "Non-Standard", "Referral Required"],
  yesNo: ["No","Yes"],
  yesNoUnknown: ["No","Yes","Unknown"],
  paymentPlans: ["Paid in Full", "2 Pay", "4 Pay", "Monthly EFT", "Monthly Direct Bill"],
  billingMethods: ["Insured Bill", "Mortgagee Escrow", "Agency Bill", "EFT", "Credit/Debit Card"],
  homeFormTypes: ["Homeowners HO3","Homeowners HO5","Condo HO6","Renters HO4","Dwelling Fire DP3"],
  autoPolicyTypes: ["Personal Auto", "Named Non-Owner", "Collector Vehicle", "Motorcycle", "Recreational Vehicle"]
};

window.QUOTE_SCHEMAS = {
  auto: {
    title: "Personal Auto New Business Quote",
    sections: [
      {
        title: "Transaction & Agency Setup",
        fields: [
          {name:"effective_date", label:"Requested Policy Effective Date", type:"date", required:true},
          {name:"expiration_date", label:"Requested Expiration Date", type:"date"},
          {name:"line_of_business", label:"Line of Business", type:"select", options:window.CARRIER_REFERENCE.autoPolicyTypes, required:true},
          {name:"transaction_type", label:"Transaction Type", type:"select", options:["New Business","Rewrite","Remarket / Replacement","Add Line to Existing Account"], required:true},
          {name:"producer_code", label:"Producer / Agency Code", type:"text", placeholder:"Example: LAVA-001", required:true},
          {name:"csr_name", label:"CSR / Servicing Rep", type:"text", placeholder:"VA or processor name"},
          {name:"quote_state", label:"Rating State", type:"select", options:window.CARRIER_REFERENCE.states, required:true},
          {name:"source", label:"Submission Source", type:"select", options:["Phone Call","Email Request","Agency Website","Referral","Renewal Review","Walk-in"], required:true}
        ]
      },
      {
        title: "Named Insured & Contact Information",
        fields: [
          {name:"insured_first", label:"Named Insured First Name", type:"text", required:true},
          {name:"insured_middle", label:"Middle Initial", type:"text"},
          {name:"insured_last", label:"Named Insured Last Name", type:"text", required:true},
          {name:"suffix", label:"Suffix", type:"select", options:["","Jr.","Sr.","II","III","IV"]},
          {name:"email", label:"Email Address", type:"email", required:true},
          {name:"phone", label:"Primary Phone Number", type:"tel", required:true},
          {name:"alternate_phone", label:"Alternate Phone Number", type:"tel"},
          {name:"dob", label:"Date of Birth", type:"date", required:true},
          {name:"gender", label:"Gender", type:"select", options:["Female","Male","Non-disclosed"], required:true},
          {name:"marital_status", label:"Marital Status", type:"select", options:["Single","Married","Domestic Partner","Divorced","Separated","Widowed"], required:true},
          {name:"occupation", label:"Occupation", type:"text"},
          {name:"education_level", label:"Highest Education Level", type:"select", options:["No High School Diploma","High School / GED","Some College","Associate Degree","Bachelor's Degree","Graduate Degree","Declined/Not Used"]},
          {name:"residence_type", label:"Residence Type", type:"select", options:["Own Home","Rent","Live with Family","Condo","Apartment","Other"], required:true}
        ]
      },
      {
        title: "Mailing, Garaging & Prior Address",
        fields: [
          {name:"mailing_address", label:"Mailing Street Address", type:"text", required:true},
          {name:"mailing_unit", label:"Unit / Apt", type:"text"},
          {name:"mailing_city", label:"Mailing City", type:"text", required:true},
          {name:"mailing_state", label:"Mailing State", type:"select", options:window.CARRIER_REFERENCE.states, required:true},
          {name:"mailing_zip", label:"Mailing ZIP", type:"text", required:true},
          {name:"garaging_same", label:"Garaging Address Same as Mailing?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"garaging_address", label:"Garaging Street Address if Different", type:"text"},
          {name:"garaging_city", label:"Garaging City", type:"text"},
          {name:"garaging_state", label:"Garaging State", type:"select", options:[""].concat(window.CARRIER_REFERENCE.states)},
          {name:"garaging_zip", label:"Garaging ZIP", type:"text", required:true},
          {name:"years_at_address", label:"Years at Current Address", type:"number", required:true},
          {name:"prior_address", label:"Prior Address if Less Than 2 Years", type:"text"}
        ]
      },
      {
        title: "Prior Insurance & Current Coverage",
        fields: [
          {name:"currently_insured", label:"Currently Insured?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"prior_carrier", label:"Current/Prior Carrier", type:"text", required:true},
          {name:"prior_policy_number", label:"Prior Policy Number", type:"text"},
          {name:"prior_expiration", label:"Prior Policy Expiration", type:"date", required:true},
          {name:"prior_effective", label:"Prior Policy Effective Date", type:"date"},
          {name:"continuous_months", label:"Continuous Insurance Months", type:"number", required:true},
          {name:"prior_limits", label:"Prior Bodily Injury Limits", type:"select", options:window.CARRIER_REFERENCE.autoLiabilityLimits, required:true},
          {name:"lapse_days", label:"Any Coverage Lapse? Enter Number of Days", type:"number", required:true},
          {name:"nonpay_cancel_3yrs", label:"Any Non-Pay Cancellation in Last 3 Years?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"prior_claims", label:"Any Prior Auto Claims Last 5 Years?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"claim_details", label:"Prior Claim Details", type:"textarea", placeholder:"Date, type of loss, fault, payout, injury involved."},
          {name:"current_dec_page_ready", label:"Current Declarations Page Available?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true}
        ]
      },
      {
        title: "Vehicle 1 - Identification & Use",
        fields: [
          {name:"vehicle_year", label:"Vehicle Year", type:"number", required:true},
          {name:"vehicle_make", label:"Make", type:"text", required:true},
          {name:"vehicle_model", label:"Model", type:"text", required:true},
          {name:"vehicle_trim", label:"Trim / Body Style", type:"text"},
          {name:"vin", label:"VIN", type:"text", required:true},
          {name:"vehicle_value", label:"Estimated Vehicle Value", type:"number"},
          {name:"ownership", label:"Ownership", type:"select", options:["Owned","Financed","Leased","Company Owned"], required:true},
          {name:"lienholder_name", label:"Lienholder / Loss Payee Name", type:"text"},
          {name:"vehicle_use", label:"Primary Use", type:"select", options:["Pleasure","Commute","Business","Farm","School","Rideshare/Delivery","Artisan Use"], required:true},
          {name:"annual_miles", label:"Annual Mileage", type:"number", required:true},
          {name:"commute_miles", label:"One-way Commute Miles", type:"number", required:true},
          {name:"days_per_week", label:"Days Per Week Driven to Work/School", type:"number"},
          {name:"parking_location", label:"Where is Vehicle Parked Overnight?", type:"select", options:["Garage","Driveway","Street","Carport","Parking Lot","Storage Facility"], required:true},
          {name:"anti_theft", label:"Anti-theft / Tracking Device?", type:"select", options:["None","Passive Alarm","Active Alarm","Vehicle Recovery System","Factory Tracking App"], required:true}
        ]
      },
      {
        title: "Additional Vehicles / Multi-Car Details",
        fields: [
          {name:"additional_vehicles", label:"Number of Additional Vehicles", type:"number", required:true},
          {name:"vehicle2_details", label:"Vehicle 2 Details if Applicable", type:"textarea", placeholder:"Year, make, model, VIN, use, ownership, annual miles."},
          {name:"vehicle3_details", label:"Vehicle 3 Details if Applicable", type:"textarea", placeholder:"Year, make, model, VIN, use, ownership, annual miles."},
          {name:"all_vehicles_same_household", label:"All Vehicles Garaged in Same Household?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"any_modified_vehicle", label:"Any Lifted, Modified, Classic, Exotic, or High Performance Vehicle?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"vehicle_photos_required", label:"Vehicle Photos Required by Carrier?", type:"select", options:["No","Yes - Damage Photos","Yes - Full Vehicle Photos","Unknown"], required:true}
        ]
      },
      {
        title: "Driver 1 - License & Experience",
        fields: [
          {name:"driver_license", label:"Driver License Number", type:"text", required:true},
          {name:"license_state", label:"License State", type:"select", options:window.CARRIER_REFERENCE.states, required:true},
          {name:"license_status", label:"License Status", type:"select", options:["Valid","Suspended","Revoked","Expired","Permit","Foreign License","No License"], required:true},
          {name:"license_original_date", label:"Original License Date", type:"date"},
          {name:"years_licensed", label:"Years Licensed", type:"number", required:true},
          {name:"good_student", label:"Good Student Discount?", type:"select", options:["No","Yes","Not Applicable"], required:true},
          {name:"defensive_driver", label:"Defensive Driver / Mature Driver Course?", type:"select", options:["No","Yes","Not Applicable"], required:true},
          {name:"driver_training", label:"Driver Training Certificate?", type:"select", options:["No","Yes","Not Applicable"], required:true},
          {name:"employment_status", label:"Employment Status", type:"select", options:["Employed","Self-employed","Student","Retired","Unemployed","Military"], required:true}
        ]
      },
      {
        title: "Household Drivers & Exclusions",
        fields: [
          {name:"household_drivers", label:"Number of Household Drivers", type:"number", required:true},
          {name:"additional_driver_details", label:"Additional Driver Details", type:"textarea", placeholder:"Name, DOB, relationship, license state/number, years licensed, violations/accidents."},
          {name:"household_members_14_plus", label:"Number of Household Members Age 14+", type:"number", required:true},
          {name:"unlisted_household", label:"Any Unlisted Household Members Age 14+?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"excluded_driver", label:"Any Excluded Driver Requested?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"excluded_driver_details", label:"Excluded Driver Name and Reason", type:"textarea"},
          {name:"non_household_regular_driver", label:"Any Non-household Regular Operator?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"student_away", label:"Student Away at School More Than 100 Miles?", type:"select", options:["No","Yes","Not Applicable"], required:true}
        ]
      },
      {
        title: "Incidents, Violations & Loss History",
        fields: [
          {name:"accidents_5yrs", label:"At-fault Accidents Last 5 Years", type:"number", required:true},
          {name:"not_at_fault_5yrs", label:"Not-at-fault Accidents Last 5 Years", type:"number", required:true},
          {name:"violations_5yrs", label:"Moving Violations Last 5 Years", type:"number", required:true},
          {name:"major_violations_5yrs", label:"Major Violations Last 5 Years? DUI, reckless, racing", type:"number", required:true},
          {name:"comp_claims_5yrs", label:"Comprehensive Claims Last 5 Years", type:"number", required:true},
          {name:"injury_claims", label:"Any Injury, Fatality, or Lawsuit Involved?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"license_suspension", label:"Any License Suspension / Revocation Last 5 Years?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"incident_notes", label:"Incident Notes", type:"textarea", placeholder:"List date, driver, description, paid amount, fault status."}
        ]
      },
      {
        title: "Coverage Selection",
        fields: [
          {name:"liability_limits", label:"Bodily Injury / Property Damage Limits", type:"select", options:window.CARRIER_REFERENCE.autoLiabilityLimits, required:true},
          {name:"um_uim", label:"UM/UIM Coverage", type:"select", options:["Reject","State Minimum","50/100","100/300","250/500","Match BI Limits"], required:true},
          {name:"medical", label:"Medical Payments / PIP", type:"select", options:["Reject","1000","2000","5000","10000","25000","50000"], required:true},
          {name:"pip_option", label:"PIP Option / Deductible if Applicable", type:"select", options:["Not Applicable","Full PIP","Limited PIP","PIP Deductible","Guest PIP Only"], required:true},
          {name:"comp_deductible", label:"Comprehensive Deductible", type:"select", options:window.CARRIER_REFERENCE.autoCompCollisionDeductibles, required:true},
          {name:"collision_deductible", label:"Collision Deductible", type:"select", options:window.CARRIER_REFERENCE.autoCompCollisionDeductibles, required:true},
          {name:"rental", label:"Rental Reimbursement", type:"select", options:["No","20/600","30/900","40/1200","50/1500","75/2250"], required:true},
          {name:"roadside", label:"Roadside Assistance", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"loan_lease_gap", label:"Loan/Lease Gap Coverage", type:"select", options:["No","Yes","Not Eligible"], required:true},
          {name:"oem_parts", label:"OEM Parts / Custom Equipment Coverage", type:"select", options:["No","OEM Parts","Custom Equipment 1000","Custom Equipment 5000"], required:true},
          {name:"new_car_replacement", label:"New Car Replacement", type:"select", options:["No","Yes","Not Eligible"], required:true}
        ]
      },
      {
        title: "Discounts, Billing & Documents",
        fields: [
          {name:"multi_policy", label:"Multi-policy Discount with Home/Renters?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"multi_car", label:"Multi-car Discount?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"telematics", label:"Telematics / Usage-Based Rating Program?", type:"select", options:["No","Yes - Enroll","Already Enrolled","Customer Declined"], required:true},
          {name:"paperless", label:"Paperless Discount?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"auto_pay", label:"Auto Pay / EFT Discount?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"paid_in_full", label:"Paid-in-Full Discount?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"payment_plan", label:"Payment Plan", type:"select", options:window.CARRIER_REFERENCE.paymentPlans, required:true},
          {name:"billing_method", label:"Billing Method", type:"select", options:window.CARRIER_REFERENCE.billingMethods, required:true},
          {name:"documents_ready", label:"Required Docs Ready? Prior Dec, Driver License, Registration", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"signed_forms_needed", label:"Signed Forms Needed? UM rejection, exclusion, EFT, PIP", type:"select", options:["No","Yes","Unknown"], required:true}
        ]
      },
      {
        title: "Carrier Underwriting Knockout Questions",
        fields: [
          {name:"sr22", label:"SR-22 / FR-44 Filing Needed?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"salvage", label:"Any Salvage, Rebuilt, Gray Market, or Custom Vehicle?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"business_delivery", label:"Used for Rideshare, Delivery, Livery, Taxi, or Commercial Hauling?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"out_of_state", label:"Vehicle Garaged Out of State More Than 30 Days?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"unacceptable_driver", label:"Any Driver with No License, Revoked License, or Major Violation?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"fraud_or_misrep", label:"Any Prior Insurance Fraud, Material Misrepresentation, or Policy Rescission?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"delivery_platforms", label:"Any App-based Delivery/Rideshare Platforms Used?", type:"text", placeholder:"Uber, Lyft, DoorDash, Instacart, etc."},
          {name:"underwriter_notes", label:"Underwriter / Processor Notes", type:"textarea", placeholder:"Document review items, missing information, and referral reason."}
        ]
      }
    ]
  },

  home: {
    title: "Homeowners New Business Quote",
    sections: [
      {
        title: "Transaction & Agency Setup",
        fields: [
          {name:"effective_date", label:"Requested Policy Effective Date", type:"date", required:true},
          {name:"expiration_date", label:"Requested Expiration Date", type:"date"},
          {name:"line_of_business", label:"Policy Form / Line of Business", type:"select", options:window.CARRIER_REFERENCE.homeFormTypes, required:true},
          {name:"transaction_type", label:"Transaction Type", type:"select", options:["New Business","Rewrite","Remarket / Replacement","Add Line to Existing Account"], required:true},
          {name:"producer_code", label:"Producer / Agency Code", type:"text", placeholder:"Example: LAVA-001", required:true},
          {name:"csr_name", label:"CSR / Servicing Rep", type:"text"},
          {name:"quote_state", label:"Property State", type:"select", options:window.CARRIER_REFERENCE.states, required:true},
          {name:"submission_source", label:"Submission Source", type:"select", options:["Phone Call","Email Request","Agency Website","Referral","Renewal Review","Loan Closing"], required:true}
        ]
      },
      {
        title: "Named Insured & Contact Information",
        fields: [
          {name:"insured_first", label:"Named Insured First Name", type:"text", required:true},
          {name:"insured_middle", label:"Middle Initial", type:"text"},
          {name:"insured_last", label:"Named Insured Last Name", type:"text", required:true},
          {name:"co_insured", label:"Co-Insured / Spouse Name", type:"text"},
          {name:"email", label:"Email Address", type:"email", required:true},
          {name:"phone", label:"Primary Phone Number", type:"tel", required:true},
          {name:"alternate_phone", label:"Alternate Phone Number", type:"tel"},
          {name:"dob", label:"Date of Birth", type:"date", required:true},
          {name:"marital_status", label:"Marital Status", type:"select", options:["Single","Married","Domestic Partner","Divorced","Separated","Widowed"], required:true},
          {name:"occupation", label:"Occupation", type:"text"},
          {name:"prior_address_if_new", label:"Prior Address if Moved Within 2 Years", type:"text"}
        ]
      },
      {
        title: "Property Location & Occupancy",
        fields: [
          {name:"property_address", label:"Property Street Address", type:"text", required:true},
          {name:"property_unit", label:"Unit / Apt", type:"text"},
          {name:"property_city", label:"Property City", type:"text", required:true},
          {name:"property_state", label:"Property State", type:"select", options:window.CARRIER_REFERENCE.states, required:true},
          {name:"property_zip", label:"Property ZIP", type:"text", required:true},
          {name:"mailing_same", label:"Mailing Address Same as Property?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"mailing_address", label:"Mailing Address if Different", type:"text"},
          {name:"occupancy", label:"Occupancy", type:"select", options:["Primary Residence","Secondary Residence","Seasonal","Tenant Occupied","Vacant","Builder's Risk / Renovation"], required:true},
          {name:"months_occupied", label:"Months Occupied Per Year", type:"number", required:true},
          {name:"purchase_date", label:"Purchase Date", type:"date"},
          {name:"purchase_price", label:"Purchase Price", type:"number"},
          {name:"closing_date", label:"Closing Date if New Purchase", type:"date"}
        ]
      },
      {
        title: "Property Valuation & Construction",
        fields: [
          {name:"year_built", label:"Year Built", type:"number", required:true},
          {name:"square_feet", label:"Total Finished Square Feet", type:"number", required:true},
          {name:"stories", label:"Number of Stories", type:"select", options:["1","1.5","2","2.5","3+"], required:true},
          {name:"construction", label:"Construction Type", type:"select", options:["Frame","Masonry","Brick Veneer","Concrete","Stucco","Log","Manufactured/Mobile","Modular"], required:true},
          {name:"foundation", label:"Foundation Type", type:"select", options:["Slab","Crawlspace","Basement - Finished","Basement - Unfinished","Pier and Beam","Pilings/Stilts"], required:true},
          {name:"basement_sqft", label:"Basement Square Feet", type:"number"},
          {name:"attached_garage", label:"Attached Garage?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"garage_stalls", label:"Garage Stalls", type:"select", options:["0","1","2","3","4+"]},
          {name:"replacement_cost_estimate", label:"Replacement Cost Estimate", type:"number", required:true},
          {name:"market_value", label:"Estimated Market Value", type:"number"},
          {name:"distance_to_coast", label:"Distance to Coast / Large Water", type:"select", options:["Not Applicable","Less than 1 mile","1 - 5 miles","5 - 10 miles","10+ miles"], required:true}
        ]
      },
      {
        title: "Roof, Utilities & Home Systems",
        fields: [
          {name:"roof_year", label:"Roof Year", type:"number", required:true},
          {name:"roof_material", label:"Roof Material", type:"select", options:["Architectural Shingle","3-tab Shingle","Metal","Tile","Slate","Wood Shake","Flat/Rolled","Other"], required:true},
          {name:"roof_shape", label:"Roof Shape", type:"select", options:["Hip","Gable","Flat","Mansard","Gambrel","Mixed/Unknown"], required:true},
          {name:"roof_condition", label:"Roof Condition", type:"select", options:["Excellent","Good","Average","Worn","Damaged/Needs Repair","Unknown"], required:true},
          {name:"electrical_type", label:"Electrical System", type:"select", options:["Circuit Breakers","Fuses","Knob and Tube","Aluminum Wiring","Updated Unknown","Other"], required:true},
          {name:"electrical_updated_year", label:"Electrical Updated Year", type:"number"},
          {name:"plumbing_type", label:"Plumbing Type", type:"select", options:["Copper","PEX","PVC/CPVC","Galvanized","Polybutylene","Mixed/Unknown"], required:true},
          {name:"plumbing_updated", label:"Plumbing Updated?", type:"select", options:["Yes","No","Partial","Unknown"], required:true},
          {name:"heating", label:"Primary Heating", type:"select", options:["Central HVAC","Electric","Gas Furnace","Heat Pump","Wood Stove","Oil","Boiler","Other"], required:true},
          {name:"hvac_year", label:"HVAC Year", type:"number"},
          {name:"water_heater_year", label:"Water Heater Year", type:"number"},
          {name:"solid_fuel", label:"Wood Stove / Solid Fuel Heat?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true}
        ]
      },
      {
        title: "Protection, Fire & Safety",
        fields: [
          {name:"protection_class", label:"Protection Class if Known", type:"select", options:["Unknown","1","2","3","4","5","6","7","8","9","10"], required:true},
          {name:"fire_hydrant", label:"Distance to Fire Hydrant", type:"select", options:["Less than 1000 ft","1000 ft - 1 mile","1 - 5 miles","Over 5 miles","Unknown"], required:true},
          {name:"fire_station", label:"Distance to Fire Station", type:"select", options:["Less than 1 mile","1 - 5 miles","Over 5 miles","Unknown"], required:true},
          {name:"smoke_detectors", label:"Smoke Detectors?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"burglar_alarm", label:"Burglar Alarm", type:"select", options:["None","Local","Central Station","Smart Home Monitoring"], required:true},
          {name:"fire_alarm", label:"Fire Alarm", type:"select", options:["None","Local","Central Station","Smart Home Monitoring"], required:true},
          {name:"sprinkler", label:"Automatic Sprinkler System?", type:"select", options:["No","Partial","Full"], required:true},
          {name:"gated_community", label:"Gated Community?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"deadbolts", label:"Deadbolt Locks?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true}
        ]
      },
      {
        title: "Prior Insurance & Loss History",
        fields: [
          {name:"currently_insured", label:"Currently Insured?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"prior_carrier", label:"Current/Prior Home Carrier", type:"text", required:true},
          {name:"prior_policy_number", label:"Prior Policy Number", type:"text"},
          {name:"prior_effective", label:"Prior Policy Effective Date", type:"date"},
          {name:"prior_expiration", label:"Prior Policy Expiration", type:"date", required:true},
          {name:"years_continuous_home", label:"Years of Continuous Home Insurance", type:"number", required:true},
          {name:"prior_cancel_nonrenewal", label:"Any Prior Cancellation / Non-renewal?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"claims_5yrs", label:"Number of Property Claims Last 5 Years", type:"number", required:true},
          {name:"water_claims_5yrs", label:"Water Claims Last 5 Years", type:"number", required:true},
          {name:"liability_claims_5yrs", label:"Liability Claims Last 5 Years", type:"number", required:true},
          {name:"weather_claims_5yrs", label:"Weather/Wind/Hail Claims Last 5 Years", type:"number", required:true},
          {name:"claim_details", label:"Claim Details", type:"textarea", placeholder:"Date, cause of loss, amount paid, open/closed, repairs completed."},
          {name:"repairs_completed", label:"Were All Prior Claim Repairs Completed?", type:"select", options:["No Prior Claims","Yes","No","Unknown"], required:true}
        ]
      },
      {
        title: "Coverage Selection",
        fields: [
          {name:"coverage_a", label:"Dwelling Coverage A", type:"select", options:window.CARRIER_REFERENCE.homeCoverageA, required:true},
          {name:"coverage_b", label:"Other Structures Coverage B", type:"select", options:["10% of A","20% of A","30% of A","Specific Amount"], required:true},
          {name:"coverage_c", label:"Personal Property Coverage C", type:"select", options:["50% of A","60% of A","70% of A","Specific Amount"], required:true},
          {name:"coverage_d", label:"Loss of Use Coverage D", type:"select", options:["20% of A","30% of A","40% of A","Actual Loss Sustained"], required:true},
          {name:"deductible", label:"All Other Perils Deductible", type:"select", options:window.CARRIER_REFERENCE.deductibles, required:true},
          {name:"wind_hail", label:"Wind/Hail Deductible", type:"select", options:window.CARRIER_REFERENCE.percentDeductibles, required:true},
          {name:"hurricane_deductible", label:"Hurricane / Named Storm Deductible", type:"select", options:window.CARRIER_REFERENCE.percentDeductibles, required:true},
          {name:"liability", label:"Personal Liability Limit", type:"select", options:["100000","300000","500000","1000000"], required:true},
          {name:"medical", label:"Medical Payments to Others", type:"select", options:["1000","5000","10000","25000"], required:true},
          {name:"replacement_cost", label:"Personal Property Replacement Cost", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"extended_replacement", label:"Dwelling Extended Replacement Cost", type:"select", options:["No","25%","50%","Guaranteed Replacement Cost"], required:true}
        ]
      },
      {
        title: "Optional Endorsements",
        fields: [
          {name:"water_backup", label:"Water Backup / Sump Overflow", type:"select", options:["No","5000","10000","25000","50000","100000"], required:true},
          {name:"service_line", label:"Service Line Coverage", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"equipment_breakdown", label:"Equipment Breakdown", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"identity_theft", label:"Identity Theft / Cyber Coverage", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"scheduled_property", label:"Scheduled Personal Property?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"scheduled_items", label:"Scheduled Items Details", type:"textarea", placeholder:"Jewelry, watches, firearms, fine arts, collectibles. Include value and appraisal status."},
          {name:"ordinance_law", label:"Ordinance or Law Coverage", type:"select", options:["10%","25%","50%","Not Selected"], required:true},
          {name:"loss_assessment", label:"Loss Assessment", type:"select", options:["No","1000","5000","10000","25000","50000"], required:true},
          {name:"home_sharing", label:"Home Sharing Endorsement Needed?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true}
        ]
      },
      {
        title: "Mortgagee, Additional Interests & Billing",
        fields: [
          {name:"mortgagee", label:"Mortgagee / Loss Payee Name", type:"text"},
          {name:"mortgagee_address", label:"Mortgagee Address", type:"text"},
          {name:"loan_number", label:"Loan Number", type:"text"},
          {name:"second_mortgagee", label:"Second Mortgagee / Additional Interest", type:"text"},
          {name:"billing_method", label:"Billing Method", type:"select", options:window.CARRIER_REFERENCE.billingMethods, required:true},
          {name:"payment_plan", label:"Payment Plan", type:"select", options:window.CARRIER_REFERENCE.paymentPlans, required:true},
          {name:"escrowed", label:"Is Premium Escrowed?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"closing_request", label:"Closing / Mortgagee Evidence Needed Today?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"paperless", label:"Paperless Delivery?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true}
        ]
      },
      {
        title: "Risk Hazards & Liability Exposure",
        fields: [
          {name:"pool", label:"Swimming Pool?", type:"select", options:["No","Yes - fenced","Yes - unfenced","Yes - diving board/slide"], required:true},
          {name:"trampoline", label:"Trampoline?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"dogs", label:"Dogs or Animals?", type:"select", options:["No","Yes - no bite history","Yes - bite history","Restricted breed / unknown"], required:true},
          {name:"business", label:"Business Conducted on Premises?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"short_term_rental", label:"Short-term Rental / Airbnb Exposure?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"vacant", label:"Vacant or Under Renovation?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"brushfire", label:"Brushfire / Wildfire Exposure or Less Than 500 ft From Brush?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"flood_zone", label:"Flood Zone", type:"select", options:["Unknown","X / Preferred","A","AE","V","VE","Other High Risk"], required:true},
          {name:"flood_policy", label:"Separate Flood Policy in Place?", type:"select", options:window.CARRIER_REFERENCE.yesNoUnknown, required:true},
          {name:"previous_sinkhole", label:"Sinkhole / Mine Subsidence Exposure?", type:"select", options:window.CARRIER_REFERENCE.yesNoUnknown, required:true},
          {name:"farm_animals", label:"Farm Animals / Livestock on Premises?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"rental_units", label:"Any Rental Units, ADU, or Room Rental?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"open_foundation_hazards", label:"Any Unrepaired Damage, Peeling Paint, Broken Steps, or Liability Hazards?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true}
        ]
      },
      {
        title: "Carrier Underwriting Knockout Questions",
        fields: [
          {name:"prior_fraud", label:"Any Prior Fraud, Misrepresentation, or Policy Rescission?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"tax_lien_bankruptcy", label:"Bankruptcy, Foreclosure, or Tax Lien in Last 5 Years?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"illegal_activity", label:"Any Illegal Activity, Grow Operation, or Unsafe Occupancy?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"unrepaired_damage", label:"Any Existing or Unrepaired Damage?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"renovation_over_30", label:"Renovation Over 30 Days or Structural Work?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"roof_less_than_acceptable", label:"Roof Outside Carrier Age/Condition Appetite?", type:"select", options:["No","Yes","Unknown"], required:true},
          {name:"photos_required", label:"Exterior/Interior Photos Required?", type:"select", options:["No","Yes - Exterior","Yes - Interior and Exterior","Unknown"], required:true},
          {name:"inspection_consent", label:"Customer Agrees to Possible Inspection?", type:"select", options:window.CARRIER_REFERENCE.yesNo, required:true},
          {name:"underwriter_notes", label:"Underwriter / Processor Notes", type:"textarea", placeholder:"Document missing information, referral concern, photos needed, or carrier appetite issue."}
        ]
      }
    ]
  }
};
