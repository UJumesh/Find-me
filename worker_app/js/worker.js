// Find Me - Worker / Provider Portal Logic
let currentProvider = {
  id: 'prf-suresh-plumb',
  userId: 'usr-prov-suresh',
  name: 'Suresh Kumar',
  email: 'suresh@findme.com',
  phone: '+91 9845012345',
  avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
  categoryName: 'Master Plumber',
  rating: 4.9,
  reviewsCount: 142,
  isAvailable: 1
};

let activeJob = null;
let incomingLead = null;
let slaInterval = null;
let socket = null;

document.addEventListener('DOMContentLoaded', () => {
  initSocket();
  loadProviderProfile();
  loadProviderEarnings();
  loadRecentJobs();
  setupEventListeners();
});

// Toast System
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.style = `
    background: #1e293b;
    border-left: 4px solid ${type === 'success' ? '#10b981' : (type === 'error' ? '#f43f5e' : '#6366f1')};
    color: #fff;
    padding: 12px 18px;
    border-radius: 8px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.4);
    font-size: 13.5px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
  `;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : 'ℹ️'}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Socket.io Real-Time Connection
function initSocket() {
  try {
    socket = io();

    socket.on('connect', () => {
      console.log('⚡ Worker App connected to WebSocket server');
      if (currentProvider) {
        socket.emit('join_provider', currentProvider.id);
      }
    });

    // Real-Time Incoming Lead Alert
    socket.on('new_lead', (data) => {
      console.log('🚨 NEW LEAD RECEIVED:', data);
      triggerIncomingLeadModal(data.booking, data.slaSeconds || 90);
    });

    // Review notification
    socket.on('new_review_received', (data) => {
      showToast(`⭐ New 5-star review received! Rating: ${data.rating}/5`, 'success');
      loadProviderProfile();
      loadRecentJobs();
    });
  } catch (err) {
    console.warn('Socket connection error:', err);
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Online/Offline Availability Toggle
  document.getElementById('availabilityToggle').addEventListener('click', toggleAvailability);

  // Provider Switcher Modal
  document.getElementById('providerPickerBtn').addEventListener('click', openProviderSwitcher);
  document.getElementById('closeProviderListModal').addEventListener('click', () => {
    document.getElementById('providerListModal').classList.remove('active');
  });

  // Incoming Lead Accept / Decline
  document.getElementById('acceptLeadBtn').addEventListener('click', handleAcceptLead);
  document.getElementById('declineLeadBtn').addEventListener('click', handleDeclineLead);

  // Active Job Step Progression
  document.getElementById('stepEnRouteBtn').addEventListener('click', () => updateJobStatus('EN_ROUTE'));
  document.getElementById('stepInProgressBtn').addEventListener('click', () => updateJobStatus('IN_PROGRESS'));
  document.getElementById('stepCompleteBtn').addEventListener('click', () => updateJobStatus('COMPLETED'));

  // Chat trigger
  document.getElementById('providerChatBtn').addEventListener('click', () => {
    const text = prompt('Enter a quick update to send to customer:');
    if (text && activeJob && socket) {
      socket.emit('send_message', {
        bookingId: activeJob.id,
        senderId: currentProvider.userId,
        senderName: currentProvider.name,
        senderRole: 'PROVIDER',
        content: text
      });
      showToast('Message sent to customer!', 'success');
    }
  });

  // Demo Lead Simulator
  document.getElementById('simulateLeadBtn').addEventListener('click', simulateDemoLead);

  // Payout Request
  document.getElementById('requestPayoutBtn').addEventListener('click', () => {
    const bal = document.getElementById('ledgerBalance').innerText;
    showToast(`Payout request for ${bal} initiated to linked UPI! Estimated credit: 15 mins`, 'success');
  });
}

// Toggle Online/Offline Status
async function toggleAvailability() {
  const newStatus = currentProvider.isAvailable ? 0 : 1;
  try {
    const res = await fetch(`/api/providers/${currentProvider.id}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: newStatus })
    });
    const data = await res.json();
    currentProvider.isAvailable = newStatus;
    
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (newStatus) {
      dot.className = 'status-dot';
      text.innerText = 'ONLINE (Accepting Leads)';
      showToast('You are now ONLINE and visible to customers', 'success');
    } else {
      dot.className = 'status-dot offline';
      text.innerText = 'OFFLINE (Paused)';
      showToast('You are now OFFLINE', 'warning');
    }
  } catch (err) {
    showToast('Failed to toggle availability', 'error');
  }
}

// Trigger Incoming Lead Modal with SLA Timer
function triggerIncomingLeadModal(booking, slaSeconds = 90) {
  incomingLead = booking;
  const modal = document.getElementById('incomingLeadModal');
  modal.classList.add('active');

  document.getElementById('leadModalTitle').innerText = booking.description || 'Emergency Service Request';
  document.getElementById('leadModalAddress').innerHTML = `📍 ${booking.address || 'Indiranagar, Bengaluru'} • <strong>1.8 km away</strong>`;
  document.getElementById('leadModalCustomer').innerText = booking.customer_name || 'Customer';

  const price = booking.final_price || booking.estimated_price || 400;
  const earnings = Math.round(price * 0.85); // 85% after 15% platform fee
  document.getElementById('leadModalEarnings').innerText = `₹${earnings}`;

  // Start SLA Countdown
  let remaining = slaSeconds;
  document.getElementById('slaCountdownNum').innerText = remaining;

  if (slaInterval) clearInterval(slaInterval);
  slaInterval = setInterval(() => {
    remaining--;
    document.getElementById('slaCountdownNum').innerText = remaining;
    if (remaining <= 0) {
      clearInterval(slaInterval);
      modal.classList.remove('active');
      showToast('Offer timed out and re-routed to next provider', 'warning');
    }
  }, 1000);
}

// Accept Incoming Lead
async function handleAcceptLead() {
  if (!incomingLead) return;
  if (slaInterval) clearInterval(slaInterval);

  try {
    const res = await fetch(`/api/bookings/${incomingLead.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: currentProvider.id })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    activeJob = data.booking;
    document.getElementById('incomingLeadModal').classList.remove('active');
    renderActiveJobConsole(activeJob);
    showToast('Booking accepted! Customer notified.', 'success');

    if (socket) {
      socket.emit('join_booking', activeJob.id);
    }
  } catch (err) {
    showToast(`Failed to accept lead: ${err.message}`, 'error');
  }
}

// Decline Lead
function handleDeclineLead() {
  if (slaInterval) clearInterval(slaInterval);
  document.getElementById('incomingLeadModal').classList.remove('active');
  incomingLead = null;
  showToast('Lead declined. Status remains Online.', 'info');
}

// Update Active Job Status Pipeline
async function updateJobStatus(newStatus) {
  if (!activeJob) return;

  try {
    const res = await fetch(`/api/bookings/${activeJob.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        finalPrice: activeJob.final_price || activeJob.estimated_price
      })
    });
    const data = await res.json();
    activeJob = data.booking;
    renderActiveJobConsole(activeJob);

    // Emit live location ping simulation if En Route
    if (newStatus === 'EN_ROUTE' && socket) {
      socket.emit('update_live_location', {
        bookingId: activeJob.id,
        latitude: 12.9780,
        longitude: 77.6400,
        etaMinutes: 8
      });
    }

    if (newStatus === 'COMPLETED') {
      showToast('🎉 Job completed successfully! Earnings added to your ledger.', 'success');
      activeJob = null;
      document.getElementById('activeJobSection').style.display = 'none';
      document.getElementById('noJobPlaceholder').style.display = 'block';
      loadProviderEarnings();
      loadRecentJobs();
    } else {
      showToast(`Status updated to ${newStatus}`, 'info');
    }
  } catch (err) {
    showToast('Failed to update status', 'error');
  }
}

// Render Active Job UI Console
function renderActiveJobConsole(job) {
  if (!job || job.status === 'COMPLETED' || job.status === 'CANCELLED') {
    document.getElementById('activeJobSection').style.display = 'none';
    document.getElementById('noJobPlaceholder').style.display = 'block';
    return;
  }

  document.getElementById('noJobPlaceholder').style.display = 'none';
  const section = document.getElementById('activeJobSection');
  section.style.display = 'block';

  document.getElementById('activeJobTitle').innerText = job.description || 'Assigned Service Task';
  document.getElementById('activeJobCustomer').innerHTML = `Customer: <strong>${job.customer_name || 'Customer'}</strong> • 📞 <span>${job.customer_phone || '+91 98112-XXXXX'}</span>`;
  document.getElementById('activeJobPrice').innerText = `₹${Math.round((job.final_price || job.estimated_price || 450) * 0.85)}`;
  document.getElementById('activeJobAddress').innerHTML = `📍 <strong>Location:</strong> ${job.address || 'Indiranagar, Bengaluru'}`;
  document.getElementById('activeJobStatusText').innerHTML = `Current Status: <strong>${job.status}</strong>`;

  const btnEnRoute = document.getElementById('stepEnRouteBtn');
  const btnInProgress = document.getElementById('stepInProgressBtn');
  const btnComplete = document.getElementById('stepCompleteBtn');

  if (job.status === 'ACCEPTED') {
    btnEnRoute.style.display = 'inline-flex';
    btnInProgress.style.display = 'none';
    btnComplete.style.display = 'none';
  } else if (job.status === 'EN_ROUTE') {
    btnEnRoute.style.display = 'none';
    btnInProgress.style.display = 'inline-flex';
    btnComplete.style.display = 'none';
  } else if (job.status === 'IN_PROGRESS') {
    btnEnRoute.style.display = 'none';
    btnInProgress.style.display = 'none';
    btnComplete.style.display = 'inline-flex';
  }
}

// Load Provider Profile
async function loadProviderProfile() {
  try {
    const res = await fetch(`/api/providers/${currentProvider.id}`);
    const data = await res.json();
    if (data.provider) {
      document.getElementById('headerProviderName').innerText = data.provider.name;
      document.getElementById('headerProviderAvatar').src = data.provider.avatar_url;
      document.getElementById('statRating').innerText = `${data.provider.rating || 4.9} ⭐`;
      document.getElementById('statReviewsCount').innerText = `${data.provider.review_count || 12} verified reviews`;
      document.getElementById('providerBioText').innerText = data.provider.bio || 'Verified service professional.';
    }
  } catch (err) {
    console.error('Failed to load profile:', err);
  }
}

// Load Provider Earnings Ledger
async function loadProviderEarnings() {
  try {
    const res = await fetch(`/api/providers/${currentProvider.id}/earnings`);
    const data = await res.json();
    if (data.summary) {
      document.getElementById('statEarnings').innerText = `₹${data.summary.totalEarnings || 1850}`;
      document.getElementById('statJobsCompleted').innerText = data.summary.completedJobs || 4;
      document.getElementById('ledgerBalance').innerText = `₹${data.summary.totalEarnings || 1570}`;
    }
  } catch (err) {
    console.error('Failed to load earnings:', err);
  }
}

// Load Recent Jobs History
async function loadRecentJobs() {
  try {
    const res = await fetch(`/api/bookings/provider/${currentProvider.id}`);
    const data = await res.json();
    const list = document.getElementById('providerJobHistoryList');
    list.innerHTML = '';

    if (!data.bookings || data.bookings.length === 0) {
      list.innerHTML = `<p style="font-size: 13px; color: var(--text-muted); text-align: center; padding: 16px;">No recent jobs recorded.</p>`;
      return;
    }

    // Check if there is an active job
    const active = data.bookings.find(b => ['ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS'].includes(b.status));
    if (active) {
      activeJob = active;
      renderActiveJobConsole(active);
    }

    data.bookings.slice(0, 5).forEach(b => {
      const item = document.createElement('div');
      item.className = 'lead-item';
      const earnings = Math.round((b.final_price || b.estimated_price || 400) * 0.85);
      item.innerHTML = `
        <div>
          <h4 style="font-size: 14px; margin-bottom: 2px;">${b.description || 'Service Job'}</h4>
          <p style="font-size: 12px; color: var(--text-muted);">
            Customer: ${b.customer_name || 'Uma'} • Status: <strong style="color: ${b.status === 'COMPLETED' ? 'var(--accent-emerald)' : 'var(--accent-cyan)'};">${b.status}</strong>
          </p>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 16px; font-weight: 800; color: var(--accent-emerald);">+₹${earnings}</span>
          <span style="display: block; font-size: 11px; color: var(--text-muted);">${new Date(b.created_at).toLocaleDateString()}</span>
        </div>
      `;
      list.appendChild(item);
    });
  } catch (err) {
    console.error('Failed to load recent jobs:', err);
  }
}

// Provider Switcher Modal
async function openProviderSwitcher() {
  try {
    const res = await fetch('/api/providers');
    const data = await res.json();
    const list = document.getElementById('providerPersonaList');
    list.innerHTML = '';

    data.providers.forEach(p => {
      const item = document.createElement('div');
      item.style = `display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); cursor: pointer;`;
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${p.avatar_url}" style="width: 38px; height: 38px; border-radius: 50%;">
          <div>
            <h4 style="font-size: 14px;">${p.name}</h4>
            <p style="font-size: 12px; color: var(--text-secondary);">${p.rating}⭐ • ${p.experience_years} yrs exp</p>
          </div>
        </div>
        <span style="font-size: 11px; font-weight: 700; color: var(--accent-emerald);">${p.verification_status}</span>
      `;
      item.addEventListener('click', () => {
        currentProvider = {
          id: p.id,
          userId: p.user_id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          avatarUrl: p.avatar_url,
          rating: p.rating,
          isAvailable: p.is_available
        };
        document.getElementById('providerListModal').classList.remove('active');
        showToast(`Switched active provider to ${p.name}`, 'info');
        loadProviderProfile();
        loadProviderEarnings();
        loadRecentJobs();
        if (socket) {
          socket.emit('join_provider', currentProvider.id);
        }
      });
      list.appendChild(item);
    });

    document.getElementById('providerListModal').classList.add('active');
  } catch (err) {
    console.error('Failed to load providers:', err);
  }
}

// Simulate demo incoming lead
function simulateDemoLead() {
  const sampleLead = {
    id: 'bk-sim-' + Math.floor(1000 + Math.random() * 9000),
    description: 'Master bathroom shower diverter jammed and leaking heavily',
    customer_name: 'Urgent Uma',
    address: '100ft Road, Indiranagar, Bengaluru',
    estimated_price: 480,
    urgency: 'URGENT'
  };
  triggerIncomingLeadModal(sampleLead, 90);
  showToast('Simulated incoming customer lead alert!', 'info');
}
