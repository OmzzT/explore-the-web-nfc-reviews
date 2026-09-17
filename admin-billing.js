/* Extend the authenticated Businesses renderer without creating a second Supabase client. */
(() => {
  const container = document.getElementById('businesses');
  if (!container || typeof renderBusinesses !== 'function') return;

  const originalRender = renderBusinesses;
  const pending = new Set();
  const checkoutEndpoint = `${supabaseUrl}/functions/v1/create-subscription-checkout`;

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

      // A business with an existing subscription must not receive another checkout.
      if (billing !== 'not_configured' || business.stripe_subscription_id || !business.owner_email) return;
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:10px 0;';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'send-subscription-checkout';
      button.dataset.businessId = business.id;
      button.textContent = pending.has(business.id) ? 'Sending…' : 'Send payment link';
      button.disabled = pending.has(business.id);
      button.style.cssText = 'border:1px solid #111827;border-radius:9px;background:#111827;color:#fff;padding:9px 12px;font-size:13px;font-weight:700;cursor:pointer;';
      const result = document.createElement('span');
      result.className = 'checkout-result';
      result.setAttribute('role', 'status');
      result.style.cssText = 'font-size:13px;overflow-wrap:anywhere;';
      actions.append(button, result);
      const reviewLink = Array.from(card.querySelectorAll('a')).find(a => a.textContent.includes('Open Google review link'));
      if (reviewLink?.closest('p')) reviewLink.closest('p').before(actions);
      else card.append(actions);
    });
  };

  container.addEventListener('click', async (event) => {
    const button = event.target.closest('button.send-subscription-checkout');
    if (!button || !container.contains(button)) return;
    const business = businessesData.find(item => item.id === button.dataset.businessId);
    if (!business || pending.has(business.id)) return;
    if ((business.billing_status || 'not_configured') !== 'not_configured' || business.stripe_subscription_id) {
      window.alert('This business already has subscription information. Refresh and check its billing status.');
      return;
    }
    if (!window.confirm(`Send a Stripe sandbox subscription checkout for £14.99/month to ${business.owner_email} (${business.business_name})?\n\nOnly continue if this is a test recipient.`)) return;

    const result = button.parentElement.querySelector('.checkout-result');
    pending.add(business.id);
    button.disabled = true;
    button.textContent = 'Sending…';
    result.textContent = '';
    try {
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError || !session?.access_token) throw new Error('Please sign in again.');
      const response = await fetch(checkoutEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ business_id: business.id })
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Could not create checkout.');
      result.textContent = data.email_sent
        ? 'Checkout email submitted to Resend (delivery not yet confirmed). '
        : 'Email could not be sent. Copy the checkout link instead. ';
      if (data.checkout_url) {
        const copy = document.createElement('button');
        copy.type = 'button';
        copy.textContent = 'Copy checkout link';
        copy.style.cssText = 'border:1px solid #d1d5db;border-radius:8px;background:#fff;padding:6px 9px;cursor:pointer;';
        copy.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(data.checkout_url);
            copy.textContent = 'Copied ✓';
          } catch {
            window.prompt('Copy this Stripe checkout link:', data.checkout_url);
          }
        });
        result.append(copy);
      }
      // Keep this button disabled after a successful request to avoid duplicate emails.
      button.textContent = 'Link created';
      return;
    } catch (error) {
      result.textContent = error instanceof Error ? error.message : 'Could not send the payment link.';
    } finally {
      pending.delete(business.id);
      if (button.textContent !== 'Link created') {
        button.disabled = false;
        button.textContent = 'Send payment link';
      }
    }
  });

  // Businesses may already have loaded before this script executes.
  if (businessesData.length) renderBusinesses();
})();
