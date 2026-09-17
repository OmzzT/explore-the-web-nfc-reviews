/* Business billing indicators. Loaded after admin.js. */
(() => {
  const container = document.getElementById('businesses');
  if (!container || typeof renderBusinesses !== 'function') return;

  const originalRender = renderBusinesses;
  const pill = (label, tone) => {
    const palette = {
      green: ['#dcfce7', '#166534'],
      amber: ['#fef3c7', '#92400e'],
      red: ['#fee2e2', '#991b1b'],
      grey: ['#f3f4f6', '#374151']
    };
    const [background, color] = palette[tone];
    const span = document.createElement('span');
    span.textContent = label;
    Object.assign(span.style, {
      display: 'inline-block', padding: '4px 9px', borderRadius: '999px',
      background, color, fontSize: '12px', fontWeight: '700'
    });
    return span;
  };

  renderBusinesses = function () {
    originalRender();
    const cards = Array.from(container.children).filter(el => el.tagName === 'DIV');
    const search = document.getElementById('business-search')?.value.trim().toLowerCase() || '';
    const status = document.getElementById('business-status-filter')?.value || 'all';
    const sort = document.getElementById('business-sort')?.value || 'newest';
    let shown = businessesData.filter(b => {
      const text = [b.business_name, b.business_code, b.owner_email].join(' ').toLowerCase();
      return text.includes(search) && (status === 'all' || (status === 'active' ? b.is_active === true : b.is_active === false));
    });
    shown = [...shown].sort((a, b) => sort === 'oldest'
      ? new Date(a.created_at) - new Date(b.created_at)
      : sort === 'name' ? String(a.business_name).localeCompare(String(b.business_name))
      : new Date(b.created_at) - new Date(a.created_at));

    cards.forEach((card, index) => {
      const business = shown[index];
      if (!business) return;
      const billing = business.billing_status || 'not_configured';
      const graceTime = business.grace_until ? new Date(business.grace_until).getTime() : NaN;
      const inGrace = billing === 'past_due' && Number.isFinite(graceTime) && graceTime > Date.now();
      const unavailable = !business.is_active || billing === 'suspended' || (billing === 'past_due' && !inGrace);
      const billingLabels = {
        active: ['Active', 'green'], past_due: ['Past due', 'amber'],
        suspended: ['Suspended', 'red'], not_configured: ['Not configured', 'grey']
      };
      const [billingLabel, billingTone] = billingLabels[billing] || [billing.replaceAll('_', ' '), 'grey'];
      const details = document.createElement('div');
      details.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin:12px 0;font-size:13px;';
      const addStatus = (label, badge) => {
        const group = document.createElement('span');
        group.style.cssText = 'display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;';
        const heading = document.createElement('strong');
        heading.textContent = label + ':';
        group.append(heading, badge);
        details.append(group);
      };
      addStatus('Billing', pill(billingLabel, billingTone));
      addStatus('NFC access', unavailable ? pill('Unavailable', 'red') : inGrace ? pill('Grace period', 'amber') : pill('Available', 'green'));
      const addDate = (label, value) => {
        if (!value || Number.isNaN(new Date(value).getTime())) return;
        const item = document.createElement('span');
        const heading = document.createElement('strong');
        heading.textContent = label + ': ';
        item.append(heading, document.createTextNode(formatDate(value)));
        details.append(item);
      };
      if (inGrace) addDate('Grace ends', business.grace_until);
      addDate('Last payment', business.last_payment_at);
      const statusParagraph = Array.from(card.querySelectorAll('p')).find(p => p.querySelector('strong')?.textContent.trim() === 'Status:');
      if (statusParagraph) statusParagraph.after(details);
      else card.append(details);
    });
  };

  renderBusinesses();
})();