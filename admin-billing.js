/* Business billing indicators. Loaded after the admin page script. */
(() => {
  const container = document.getElementById('businesses');
  const config = window.APP_CONFIG;
  if (!container || !config?.SUPABASE_URL || !config?.SUPABASE_PUBLISHABLE_KEY || !window.supabase) return;

  const client = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY);
  let businesses = [];

  const formatBillingDate = (value) => {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const pill = (label, tone) => {
    const palette = {
      green: ['#dcfce7', '#166534'], amber: ['#fef3c7', '#92400e'],
      red: ['#fee2e2', '#991b1b'], grey: ['#f3f4f6', '#374151']
    };
    const [background, color] = palette[tone] || palette.grey;
    return `<span style="display:inline-block;padding:4px 9px;border-radius:999px;background:${background};color:${color};font-size:12px;font-weight:700;">${label}</span>`;
  };

  const addIndicators = () => {
    const cards = Array.from(container.children).filter(el => el.tagName === 'DIV');
    cards.forEach(card => {
      card.querySelector('.billing-indicators')?.remove();
      const codeParagraph = Array.from(card.querySelectorAll('p')).find(p => p.querySelector('strong')?.textContent.trim() === 'Business code:');
      if (!codeParagraph) return;
      const code = codeParagraph.textContent.replace('Business code:', '').trim();
      const business = businesses.find(b => String(b.business_code) === code);
      if (!business) return;

      const billing = business.billing_status || 'not_configured';
      const graceTime = business.grace_until ? new Date(business.grace_until).getTime() : NaN;
      const inGrace = billing === 'past_due' && Number.isFinite(graceTime) && graceTime > Date.now();
      const unavailable = business.is_active === false || billing === 'suspended' || (billing === 'past_due' && !inGrace);
      const labels = {
        active: ['Active', 'green'], past_due: ['Past due', 'amber'],
        suspended: ['Suspended', 'red'], not_configured: ['Not configured', 'grey']
      };
      const [billingLabel, billingTone] = labels[billing] || [String(billing).replaceAll('_', ' '), 'grey'];
      const nfcLabel = unavailable ? ['Unavailable', 'red'] : inGrace ? ['Grace period', 'amber'] : ['Available', 'green'];

      const details = document.createElement('div');
      details.className = 'billing-indicators';
      details.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin:12px 0;font-size:13px;';
      details.innerHTML = `<span><strong>Billing:</strong> ${pill(billingLabel, billingTone)}</span><span><strong>NFC access:</strong> ${pill(nfcLabel[0], nfcLabel[1])}</span>`;

      if (inGrace) {
        const item = document.createElement('span');
        item.innerHTML = `<strong>Grace ends:</strong> ${formatBillingDate(business.grace_until)}`;
        details.append(item);
      }
      if (business.last_payment_at) {
        const item = document.createElement('span');
        item.innerHTML = `<strong>Last payment:</strong> ${formatBillingDate(business.last_payment_at)}`;
        details.append(item);
      }

      const statusParagraph = Array.from(card.querySelectorAll('p')).find(p => p.querySelector('strong')?.textContent.trim() === 'Status:');
      if (statusParagraph) statusParagraph.after(details);
      else card.append(details);
    });
  };

  const observer = new MutationObserver(() => addIndicators());
  observer.observe(container, { childList: true });

  (async () => {
    const { data, error } = await client.rpc('get_admin_businesses');
    if (error) {
      console.error('Billing indicator loading error:', error);
      return;
    }
    businesses = data || [];
    addIndicators();
  })();
})();
