/* Extend the existing authenticated Businesses renderer; do not create a second Supabase client. */
(() => {
  const container = document.getElementById('businesses');
  if (!container || typeof renderBusinesses !== 'function') return;

  const originalRender = renderBusinesses;
  const formatBillingDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };
  const pill = (label, tone) => {
    const colours = {
      green: ['#dcfce7', '#166534'], amber: ['#fef3c7', '#92400e'],
      red: ['#fee2e2', '#991b1b'], grey: ['#f3f4f6', '#374151']
    };
    const [background, color] = colours[tone] || colours.grey;
    const element = document.createElement('span');
    element.textContent = label;
    Object.assign(element.style, {
      display: 'inline-block', padding: '4px 9px', borderRadius: '999px',
      background, color, fontSize: '12px', fontWeight: '700'
    });
    return element;
  };

  renderBusinesses = function renderBusinessesWithBilling() {
    originalRender();
    const cards = Array.from(container.children).filter(element => element.tagName === 'DIV');
    cards.forEach(card => {
      const codeParagraph = Array.from(card.querySelectorAll('p')).find(p =>
        p.querySelector('strong')?.textContent.trim() === 'Business code:');
      if (!codeParagraph) return;
      const code = codeParagraph.textContent.replace('Business code:', '').trim();
      const business = businessesData.find(item => String(item.business_code) === code);
      if (!business) return;

      const billing = business.billing_status || 'not_configured';
      const graceTime = business.grace_until ? new Date(business.grace_until).getTime() : NaN;
      const inGrace = billing === 'past_due' && Number.isFinite(graceTime) && graceTime > Date.now();
      const unavailable = business.is_active !== true || billing === 'suspended' || (billing === 'past_due' && !inGrace);
      const labels = {
        active: ['Active', 'green'], past_due: ['Past due', 'amber'],
        suspended: ['Suspended', 'red'], not_configured: ['Not configured', 'grey']
      };
      const [billingLabel, billingTone] = labels[billing] || [String(billing).replaceAll('_', ' '), 'grey'];
      const [accessLabel, accessTone] = unavailable ? ['Unavailable', 'red'] :
        inGrace ? ['Grace period', 'amber'] : ['Available', 'green'];
      const details = document.createElement('div');
      details.className = 'billing-indicators';
      details.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin:12px 0;font-size:13px;';
      const addStatus = (heading, label, tone) => {
        const group = document.createElement('span');
        group.style.cssText = 'display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;';
        const strong = document.createElement('strong');
        strong.textContent = heading + ':';
        group.append(strong, pill(label, tone));
        details.append(group);
      };
      const addDate = (heading, value) => {
        const formatted = formatBillingDate(value);
        if (!formatted) return;
        const item = document.createElement('span');
        const strong = document.createElement('strong');
        strong.textContent = heading + ': ';
        item.append(strong, document.createTextNode(formatted));
        details.append(item);
      };
      addStatus('Billing', billingLabel, billingTone);
      addStatus('NFC access', accessLabel, accessTone);
      if (inGrace) addDate('Grace ends', business.grace_until);
      addDate('Last payment', business.last_payment_at);
      const statusParagraph = Array.from(card.querySelectorAll('p')).find(p =>
        p.querySelector('strong')?.textContent.trim() === 'Status:');
      if (statusParagraph) statusParagraph.after(details);
      else card.append(details);
    });
  };

  // Businesses may already have loaded before this script executes.
  if (businessesData.length) renderBusinesses();
})();
