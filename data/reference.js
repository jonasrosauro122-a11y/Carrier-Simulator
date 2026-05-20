window.LAVA_REFERENCE = {
  states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],
  autoCoverages: {
    bodilyInjury: ["State Minimum","25/50","50/100","100/300","250/500","500/500"],
    propertyDamage: ["State Minimum","25,000","50,000","100,000","250,000"],
    deductibles: ["No Coverage","100","250","500","1000","2500"],
    medPay: ["No Coverage","1,000","5,000","10,000","25,000"],
    rental: ["No Coverage","30/900","40/1200","50/1500"]
  },
  homeCoverages: {
    liability: ["100,000","300,000","500,000","1,000,000"],
    deductibles: ["500","1,000","2,500","5,000","1%","2%"],
    lossOfUse: ["10%","20%","30%","40%"]
  },
  endorsementTypes: [
    "Add Driver","Remove Driver","Add Vehicle","Remove Vehicle","Change Garaging Address",
    "Coverage Change","Add Mortgagee","Remove Mortgagee","Lienholder Change",
    "Named Insured Correction","Mailing Address Change","Add Additional Interest"
  ],
  cancelReasons: [
    "Insured Request","Non-Payment","Rewritten/Remarketed","Sold Property/Vehicle",
    "Coverage No Longer Needed","Underwriting Request","Duplicate Policy","Other"
  ],
  paymentMethods: ["ACH","Credit Card","Debit Card","Check","Money Order","Agency Sweep"],
  quoteStatus: ["Quoted","Referral Required","Declined","Bound","Issued"]
};
