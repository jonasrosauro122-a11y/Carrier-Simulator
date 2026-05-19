(function(){
  const num = value => Number(String(value ?? '').replace(/[^0-9.-]/g,'')) || 0;
  const yes = value => String(value || '').toLowerCase() === 'yes';
  const ageFromDate = date => {
    if(!date) return 0;
    const d = new Date(date); if(Number.isNaN(d.getTime())) return 0;
    return Math.max(0, new Date().getFullYear() - d.getFullYear());
  };
  const limitRank = value => ({'State Minimum':0,'25/50':1,'50/100':2,'100/300':3,'250/500':4,'500/500':5}[value] ?? 2);
  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));

  function baseFlags(line, form){
    const flags = [];
    const requiredDocs = [];
    let score = 18;
    let qaDeductions = [];

    if(line === 'auto'){
      const drivers = form.drivers || [];
      const vehicles = form.vehicles || [];
      const prior = form.prior || {};
      const uw = form.underwriting || {};
      const coverage = form.coverage || {};
      const accidents = drivers.reduce((sum,d)=>sum+num(d.accidents),0);
      const violations = drivers.reduce((sum,d)=>sum+num(d.violations),0);
      const dui = drivers.some(d=>yes(d.dui)) || yes(uw.majorViolation);
      const suspended = drivers.some(d=>String(d.licenseStatus || '').match(/Suspended|Expired/i)) || yes(uw.licenseIssue);
      const rideshare = vehicles.some(v=>yes(v.rideshare)) || yes(uw.businessUse);
      const modified = vehicles.some(v=>yes(v.modified));
      const annualMileage = vehicles.reduce((sum,v)=>sum+num(v.annualMileage),0);
      const lapseDays = num(prior.lapseDays);

      if(lapseDays > 0){score += lapseDays > 60 ? 18 : lapseDays > 30 ? 12 : 6; flags.push(`Prior insurance lapse: ${lapseDays} day(s).`); requiredDocs.push('Prior declarations page or lapse explanation');}
      if(String(prior.priorStatus || '').includes('No prior')){score += 16; flags.push('No prior insurance disclosed.');}
      if(accidents){score += accidents * 9; flags.push(`${accidents} at-fault accident(s) disclosed.`); requiredDocs.push('Loss details for accident history');}
      if(violations){score += violations * 6; flags.push(`${violations} moving violation(s) disclosed.`);}
      if(dui){score += 30; flags.push('Major violation / DUI disclosed.'); requiredDocs.push('MVR / violation details');}
      if(suspended){score += 24; flags.push('Suspended or expired license issue.'); requiredDocs.push('License status confirmation');}
      if(rideshare){score += 28; flags.push('Business, delivery, or rideshare exposure.'); requiredDocs.push('Business-use clarification');}
      if(modified){score += 12; flags.push('Modified, salvaged, or unrepaired vehicle exposure.'); requiredDocs.push('Vehicle photos or inspection notes');}
      if(annualMileage > 30000){score += 9; flags.push('High annual mileage exposure.');}
      if(limitRank(coverage.biLimit) < 2){score += 7; flags.push('Low liability limits selected.');}
      if(!yes(uw.garagingConfirmed)){score += 8; qaDeductions.push('Garaging address not verified.'); requiredDocs.push('Proof of garaging');}
      if(!yes(uw.allDriversConfirmed)){score += 12; qaDeductions.push('Household drivers/residents not fully confirmed.');}
      if(!yes(uw.registrationMatch)){score += 8; qaDeductions.push('Registration/title mismatch not resolved.'); requiredDocs.push('Vehicle registration');}
      if(vehicles.some(v=>String(v.vin||'').length && String(v.vin).length !== 17)){score += 5; qaDeductions.push('VIN is not 17 characters.');}
      if(vehicles.length < 1) qaDeductions.push('No vehicle added.');
      if(drivers.length < 1) qaDeductions.push('No driver added.');
      if(yes(coverage.telematics)) score -= 3;
      if(yes(coverage.multiPolicy)) score -= 5;
      if(yes(coverage.defensiveDriver)) score -= 3;
    }

    if(line === 'home'){
      const property = form.property || {};
      const claims = form.claims || {};
      const risk = form.risk || {};
      const uw = form.underwriting || {};
      const coverage = form.coverage || {};
      const currentYear = new Date().getFullYear();
      const roofAge = currentYear - num(property.roofYear);
      const homeAge = currentYear - num(property.yearBuilt);
      const lapseDays = num(claims.lapseDays);
      const claimCount = num(claims.claimsCount);

      if(homeAge > 50){score += 10; flags.push('Older home requires updated systems review.'); requiredDocs.push('4-point inspection or system update proof');}
      if(roofAge > 20){score += 20; flags.push(`Roof age is approximately ${roofAge} years.`); requiredDocs.push('Roof proof/photos');}
      else if(roofAge > 12){score += 8; flags.push(`Roof age is approximately ${roofAge} years.`);}
      if(String(risk.roofCondition || '').match(/Poor|Unknown/i)){score += 24; flags.push('Roof condition is poor or unknown.'); requiredDocs.push('Roof photos / inspection');}
      if(claimCount){score += claimCount * 10; flags.push(`${claimCount} property claim(s) disclosed.`); requiredDocs.push('Loss runs or claim details');}
      if(yes(claims.waterClaims)){score += 12; flags.push('Water loss history disclosed.');}
      if(lapseDays > 0){score += lapseDays > 60 ? 15 : lapseDays > 30 ? 10 : 5; flags.push(`Property insurance lapse: ${lapseDays} day(s).`);}
      if(String((form.applicant||{}).occupancy || '').match(/Vacant|Tenant|Seasonal/i)){score += 15; flags.push('Occupancy requires underwriting review.');}
      if(yes(risk.vacant)){score += 35; flags.push('Vacant / renovation / unoccupied exposure.'); requiredDocs.push('Vacancy and renovation details');}
      if(yes(risk.businessOnPremises)){score += 22; flags.push('Business exposure on premises.'); requiredDocs.push('Business exposure questionnaire');}
      if(yes(risk.shortTermRental)){score += 18; flags.push('Short-term rental exposure.'); requiredDocs.push('Rental use details');}
      if(yes(risk.trampoline)){score += 12; flags.push('Trampoline exposure.');}
      if(yes(risk.animals)){score += 16; flags.push('Animal bite/restricted breed concern.');}
      if(yes(risk.openFoundation)){score += 22; flags.push('Open foundation or unrepaired damage concern.');}
      if(yes(risk.pool) && String(risk.poolFence) !== 'Yes'){score += 14; flags.push('Pool without confirmed fence/gate.');}
      if(!yes(uw.replacementCostVerified)){score += 8; qaDeductions.push('Replacement cost estimate not verified.');}
      if(!yes(uw.roofVerified)){score += 10; qaDeductions.push('Roof age/condition not verified.');}
      if(!yes(uw.priorPolicyVerified)){score += 8; qaDeductions.push('Prior policy/loss history not verified.');}
      if(num(coverage.coverageA) < 150000){score += 7; flags.push('Low dwelling value needs review.');}
      if(yes(risk.protectiveDevices)) score -= 4;
      if(yes(coverage.serviceLine)) score += 1;
    }

    const riskScore = clamp(Math.round(score), 0, 100);
    const qaScore = clamp(100 - (qaDeductions.length * 8) - (flags.length > 4 ? 5 : 0), 0, 100);
    return {riskScore, qaScore, flags:[...new Set(flags)], requiredDocs:[...new Set(requiredDocs)], qaDeductions};
  }

  function premiumFor(line, form, carrier, base){
    let premium = line === 'auto' ? 620 : 950;
    if(line === 'auto'){
      const vehicles = form.vehicles || [];
      const drivers = form.drivers || [];
      const coverage = form.coverage || {};
      premium += vehicles.length * 560;
      premium += drivers.length > 1 ? (drivers.length-1)*130 : 0;
      premium += vehicles.reduce((sum,v)=>{
        const year = num(v.year);
        const age = new Date().getFullYear() - year;
        return sum + (age < 3 ? 220 : age > 15 ? -80 : 70) + (num(v.annualMileage) > 16000 ? 170 : 0) + (String(v.vehicleUse).includes('Business') ? 260 : 0);
      },0);
      premium += base.riskScore * 18;
      premium += limitRank(coverage.biLimit) * 70;
      if(String(coverage.compDed) === '250') premium += 90;
      if(String(coverage.collDed) === '250') premium += 120;
      if(String(coverage.compDed) === '1,000') premium -= 60;
      if(String(coverage.collDed) === '1,000') premium -= 80;
      if(yes(coverage.multiPolicy)) premium -= 120;
      if(yes(coverage.telematics)) premium -= 60;
      premium *= carrier.autoFactor;
    } else {
      const coverage = form.coverage || {};
      const property = form.property || {};
      premium += num(coverage.coverageA) * .0032;
      premium += Math.max(0, num(property.squareFeet)-1800) * .08;
      premium += base.riskScore * 16;
      if(String(coverage.aopDed) === '500') premium += 110;
      if(String(coverage.aopDed) === '2,500') premium -= 85;
      if(String(coverage.windHailDed) === '1,000') premium += 140;
      if(yes(coverage.replacementCost)) premium += 55;
      if(yes(coverage.waterBackup)) premium += 45;
      premium *= carrier.homeFactor;
    }
    return Math.max(250, Math.round(premium));
  }

  function carrierOutcome(line, form, carrier, base){
    const declineSignals = [];
    const referSignals = [];
    if(line === 'auto'){
      const drivers = form.drivers || [];
      const vehicles = form.vehicles || [];
      const uw = form.underwriting || {};
      if(vehicles.some(v=>yes(v.rideshare)) || yes(uw.businessUse)) declineSignals.push('rideshare');
      if(drivers.some(d=>yes(d.dui)) || yes(uw.majorViolation)) declineSignals.push('dui');
      if(yes(uw.sr22Needed)) declineSignals.push('sr22');
      if(drivers.some(d=>String(d.licenseStatus||'').match(/Suspended|Expired/i)) || yes(uw.licenseIssue)) declineSignals.push('suspendedLicense');
      if(base.riskScore >= 70) referSignals.push('High risk score');
      if(base.qaScore < 85) referSignals.push('QA verification incomplete');
    } else {
      const risk = form.risk || {};
      if(yes(risk.vacant)) declineSignals.push('vacant');
      if(String(risk.roofCondition||'').match(/Poor/i)) declineSignals.push('roofBad');
      if(yes(risk.businessOnPremises)) declineSignals.push('businessOnPremises');
      if(yes(risk.openFoundation)) declineSignals.push('openFoundation');
      if(base.riskScore >= 68) referSignals.push('High property risk score');
      if(base.qaScore < 85) referSignals.push('QA verification incomplete');
    }

    const carrierDeclines = carrier.decline?.[line] || [];
    const hardDecline = declineSignals.some(signal => carrierDeclines.includes(signal));
    let status = hardDecline ? 'Declined' : referSignals.length ? 'Referral' : base.riskScore < 35 ? 'Preferred' : 'Standard';
    if(carrier.code === 'NGIC' && line === 'auto' && !declineSignals.includes('fraud') && status === 'Declined') status = 'Referral';
    const notes = [];
    if(status === 'Declined') notes.push('Risk falls outside simulated carrier appetite.');
    if(status === 'Referral') notes.push('Requires underwriting review before quote can proceed.');
    if(status === 'Preferred') notes.push('Strong match for simulated appetite.');
    if(status === 'Standard') notes.push('Eligible with standard pricing assumptions.');
    [...declineSignals, ...referSignals].forEach(n=>notes.push(String(n).replace(/([A-Z])/g,' $1')));
    return {status, notes:[...new Set(notes)]};
  }

  function calculate(line, form, carrierData){
    const base = baseFlags(line, form);
    const carriers = carrierData.carriers.map(carrier=>{
      const outcome = carrierOutcome(line, form, carrier, base);
      const premium = outcome.status === 'Declined' ? 0 : premiumFor(line, form, carrier, base);
      return {
        carrier: carrier.name,
        code: carrier.code,
        tier: carrier.tier,
        brand: carrier.brand,
        status: outcome.status,
        premium,
        monthly: premium ? Math.round(premium / 10) : 0,
        downPayment: premium ? Math.round(premium * .18) : 0,
        appetiteScore: carrier.appetiteScore[line],
        notes: outcome.notes
      };
    }).sort((a,b)=>{
      const order = {Preferred:1, Standard:2, Referral:3, Declined:4};
      return (order[a.status] - order[b.status]) || (a.premium || 999999) - (b.premium || 999999);
    });
    return {...base, carriers};
  }

  window.LAVA_RATING_ENGINE = { calculate, baseFlags };
})();
