window.LAVA_CARRIER_DATA = {
  states: ['AL','AZ','CA','CO','FL','GA','IL','IN','MD','MI','NC','NV','OH','OR','PA','SC','TN','TX','VA','WA'],
  agencies: ['LAVA Training Agency','South City Insurance','Steel Insurance','Broad Market Training Desk','Personal Lines Support Desk'],
  producerCodes: ['PL-TRAIN-001','AUTO-VA-101','HOME-VA-201','NEWBIZ-330','RETENTION-440'],
  yesNo: ['No','Yes'],
  carriers: [
    {
      name:'Travelers', code:'TRV', tier:'Preferred / Standard', brand:'#b91c1c', autoFactor:1.02, homeFactor:1.04,
      appetiteScore:{auto:88,home:86},
      strengths:['Clean prior insurance history','Multi-policy households','Standard personal use','Modern homes with protective devices'],
      cautions:['Major violations','Lapse over 30 days','Older roofs without updates','Business or delivery exposure'],
      decline:{auto:['dui','sr22','rideshare'],home:['vacant','businessOnPremises','roofBad']},
      appetite:{auto:'Preferred and standard drivers with stable prior insurance, standard commute, and verified household operators.',home:'Owner-occupied primary residences with updated roof, electrical, plumbing, and heating details.'}
    },
    {
      name:'Safeco', code:'SAF', tier:'Standard / Preferred', brand:'#0369a1', autoFactor:.98, homeFactor:1.08,
      appetiteScore:{auto:84,home:80},
      strengths:['Package opportunities','Good student and telematics discounts','Mid-market households','Flexible coverage options'],
      cautions:['Business use exposure','Prior lapse','Claim frequency','Unverified household residents'],
      decline:{auto:['rideshare','dui'],home:['vacant','openFoundation']},
      appetite:{auto:'Standard to preferred personal auto risks with good household driver controls.',home:'Primary homes with acceptable claim history and routine maintenance.'}
    },
    {
      name:'Progressive', code:'PROG', tier:'Broad Market Auto', brand:'#1d4ed8', autoFactor:.94, homeFactor:1.15,
      appetiteScore:{auto:91,home:68},
      strengths:['Broad auto appetite','Prior lapse tolerance','Flexible payment options','Telematics training'],
      cautions:['Delivery/rideshare exposure','Household driver mismatch','Severe violations','High annual mileage'],
      decline:{auto:['fraud','suspendedLicense'],home:['vacant','roofBad','businessOnPremises']},
      appetite:{auto:'Broad market auto quoting with emphasis on accurate driver, vehicle, and prior insurance disclosure.',home:'Selective homeowners placement, strongest when bundled with auto.'}
    },
    {
      name:'Mercury', code:'MER', tier:'Standard Market', brand:'#9333ea', autoFactor:1.07, homeFactor:1.02,
      appetiteScore:{auto:78,home:82},
      strengths:['Stable households','Clean loss history','Standard coverage limits','Strong documentation habits'],
      cautions:['High value or unusual risks','Unverified drivers','Older properties','Coastal or wildfire exposure'],
      decline:{auto:['dui','sr22','rideshare'],home:['vacant','roofBad','openFoundation']},
      appetite:{auto:'Standard personal auto with verified household drivers and acceptable MVR activity.',home:'Owner-occupied properties with controlled hazard profile.'}
    },
    {
      name:'Bamboo', code:'BAM', tier:'Home Focus', brand:'#047857', autoFactor:1.22, homeFactor:.96,
      appetiteScore:{auto:50,home:90},
      strengths:['Home-focused placement','Clean occupancy risks','Modern construction details','Protective device credits'],
      cautions:['Vacant properties','Business on premises','Unrepaired hazards','Roof age concerns'],
      decline:{auto:['rideshare','dui','sr22'],home:['vacant','roofBad','businessOnPremises','openFoundation']},
      appetite:{auto:'Auto appears for training comparison only and is not a primary market in this simulator.',home:'Homeowners risks with clear occupancy, strong roof details, and no unresolved hazard concerns.'}
    },
    {
      name:'Erie', code:'ERI', tier:'Preferred Regional', brand:'#0f766e', autoFactor:.97, homeFactor:.99,
      appetiteScore:{auto:86,home:85},
      strengths:['Preferred households','Low claim frequency','Stable coverage limits','Quality homes'],
      cautions:['Geographic availability','Lapsed coverage','High-risk driving activity','Coverage mismatch'],
      decline:{auto:['dui','sr22','rideshare','suspendedLicense'],home:['vacant','roofBad']},
      appetite:{auto:'Preferred to standard drivers with continuous insurance and low violation activity.',home:'Quality homes with updated systems and favorable protection class.'}
    },
    {
      name:'National General', code:'NGIC', tier:'Standard / Non-Standard', brand:'#b45309', autoFactor:1.14, homeFactor:1.2,
      appetiteScore:{auto:80,home:60},
      strengths:['Non-standard auto options','SR-22 style training cases','Flexible risk review','Broad underwriting notes'],
      cautions:['Higher premium','Documentation required','Payment plan sensitivity','Referral queues'],
      decline:{auto:['fraud'],home:['vacant','roofBad','businessOnPremises']},
      appetite:{auto:'Standard and non-standard auto training cases with clear disclosure of driver history.',home:'May consider risks needing extra review and documentation.'}
    }
  ],
  documents: {
    auto:['Prior declarations page','Driver license copy','Vehicle registration','Proof of garaging','Signed UM/UIM selection or rejection','EFT authorization','Telematics consent'],
    home:['Prior declarations page','Replacement cost estimator','Roof photo or roof age proof','Mortgagee clause','Protective device proof','4-point inspection if required','Wind mitigation if required']
  }
};
