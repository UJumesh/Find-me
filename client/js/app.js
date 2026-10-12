// Find Me - Customer Web Application Logic
let currentUser = {
  id: 'usr-cust-uma',
  name: 'Urgent Uma',
  email: 'uma@example.com',
  phone: '+91 9811223344',
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  role: 'CUSTOMER'
};

let currentBooking = null;
let currentMatchedProviders = [];
let currentSelectedRating = 5;
let currentPosition = { latitude: 12.9716, longitude: 77.5946 }; // Default Bengaluru center
let socket = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initSocket();
  loadCategories();
  loadInitialProviders();
  setupEventListeners();
  checkActiveBooking();
});

// Toast System
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'warning') icon = '⚠️';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Socket.io Real-Time Connection
function initSocket() {
  try {
    socket = io();

    socket.on('connect', () => {
      console.log('⚡ Connected to Find Me real-time WebSocket server');
      if (currentUser) {
        socket.emit('join_customer', currentUser.id);
      }
    });

    socket.on('booking_status_updated', (data) => {
      console.log('📡 Real-time booking status update:', data);
      if (currentBooking && currentBooking.id === data.bookingId) {
        currentBooking = { ...currentBooking, ...data.booking };
        updateActiveTrackerBar();
        updateTrackingModalUI();
        showToast(`Booking status updated to ${data.status}!`, 'info');
      }
    });

    socket.on('new_message', (msg) => {
      if (currentBooking && currentBooking.id === msg.booking_id) {
        appendChatMessage(msg);
      }
    });

    socket.on('provider_location_changed', (data) => {
      if (currentBooking && currentBooking.id === data.bookingId) {
        const pin = document.getElementById('liveProviderPin');
        const pinName = document.getElementById('liveProviderPinName');
        if (pin && pinName) {
          pin.style.left = `${Math.min(75, Math.max(25, 25 + (1 - (data.etaMinutes || 10) / 20) * 50))}%`;
          pinName.innerText = `${currentBooking.provider_name || 'Provider'} (${data.etaMinutes || '5'} min)`;
        }
      }
    });
  } catch (err) {
    console.warn('Socket connection error:', err);
  }
}

// Event Listeners Setup
function setupEventListeners() {
  // AI Prompt Form
  document.getElementById('aiPromptForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const prompt = document.getElementById('promptInput').value.trim();
    if (prompt) {
      handlePromptAnalysis(prompt);
    }
  });

  // Prompt chip clicks
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      document.getElementById('promptInput').value = prompt;
      handlePromptAnalysis(prompt);
    });
  });

  // Voice input simulation
  const voiceBtn = document.getElementById('voiceBtn');
  voiceBtn.addEventListener('click', () => {
    voiceBtn.classList.add('recording');
    showToast('🎙️ Listening... Speak your request naturally', 'info');

    const sampleVoices = [
      'My AC is leaking water all over the floor, need someone immediately in Indiranagar',
      'The kitchen tap pipe burst and water is flooding, urgent plumber needed',
      'Power tripped suddenly when turning on the geyser, need an electrician'
    ];
    const picked = sampleVoices[Math.floor(Math.random() * sampleVoices.length)];

    setTimeout(() => {
      voiceBtn.classList.remove('recording');
      document.getElementById('promptInput').value = picked;
      showToast('Voice transcribed successfully! Matching providers...', 'success');
      handlePromptAnalysis(picked);
    }, 2200);
  });

  // Clarification submission
  document.getElementById('submitClarificationBtn').addEventListener('click', () => {
    const original = document.getElementById('promptInput').value;
    const clarification = document.getElementById('clarificationInput').value.trim();
    if (clarification) {
      handleClarification(original, clarification);
    }
  });

  // User Switcher Modal
  document.getElementById('userSwitcherBtn').addEventListener('click', openUserSwitcher);
  document.getElementById('closeUserModal').addEventListener('click', () => closeModal('userModal'));

  // Booking Modal Form
  document.getElementById('bookingForm').addEventListener('submit', handleCreateBooking);
  document.getElementById('closeBookingModal').addEventListener('click', () => closeModal('bookingModal'));

  // Live Tracking Modal & Buttons
  document.getElementById('openTrackingModalBtn').addEventListener('click', openTrackingModal);
  document.getElementById('closeTrackingModal').addEventListener('click', () => closeModal('trackingModal'));
  document.getElementById('cancelBookingBtn').addEventListener('click', handleCancelBooking);

  // Chat Drawer & Triggers
  document.getElementById('openChatBtn').addEventListener('click', openChatDrawer);
  document.getElementById('trackingChatBtn').addEventListener('click', openChatDrawer);
  document.getElementById('closeChatBtn').addEventListener('click', closeChatDrawer);
  document.getElementById('chatForm').addEventListener('submit', handleSendMessage);

  // Payment Modal & Trigger
  document.getElementById('payNowBtn').addEventListener('click', openPaymentModal);
  document.getElementById('closePaymentModal').addEventListener('click', () => closeModal('paymentModal'));
  document.getElementById('confirmPaymentBtn').addEventListener('click', handleProcessPayment);

  // Review Modal & Trigger
  document.getElementById('reviewNowBtn').addEventListener('click', openReviewModal);
  document.getElementById('closeReviewModal').addEventListener('click', () => closeModal('reviewModal'));
  document.getElementById('submitReviewBtn').addEventListener('click', handleSubmitReview);

  // Star Rating Click
  document.querySelectorAll('#starSelector .star').forEach(star => {
    star.addEventListener('click', (e) => {
      const rating = parseInt(e.target.getAttribute('data-rating'));
      currentSelectedRating = rating;
      document.querySelectorAll('#starSelector .star').forEach((s, idx) => {
        s.style.opacity = idx < rating ? '1' : '0.3';
      });
    });
  });
}

// Fetch All Categories
async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '';

    data.categories.forEach(cat => {
      const card = document.createElement('div');
      card.className = 'category-card';
      card.innerHTML = `
        <div class="category-icon">${cat.icon}</div>
        <h3>${cat.name}</h3>
        <p>${cat.description}</p>
        <div class="category-meta">
          <span>${cat.available_providers || 0} pros online</span>
          <span class="category-price">From ₹${cat.base_price}/${cat.price_unit}</span>
        </div>
      `;
      card.addEventListener('click', () => {
        document.getElementById('promptInput').value = `I need ${cat.name.toLowerCase()} service`;
        handlePromptAnalysis(`I need ${cat.name.toLowerCase()} service`);
      });
      grid.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

// Initial Top Providers
async function loadInitialProviders() {
  try {
    const res = await fetch('/api/providers?verifiedOnly=true&availableOnly=true');
    const data = await res.json();
    renderProviders(data.providers || []);
  } catch (err) {
    console.error('Failed to load initial providers:', err);
  }
}

// AI Natural Language Parsing
async function handlePromptAnalysis(prompt) {
  const submitBtn = document.getElementById('submitPromptBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>Analyzing Intent...</span> ⏳';

  try {
    const res = await fetch('/api/ai/parse-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude
      })
    });

    const data = await res.json();
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Find Providers</span> ⚡';

    renderIntentCard(data.intent);
    renderProviders(data.matchedProviders || []);
    showToast(`AI classified intent: ${data.intent.categoryName || 'General service'}`, 'success');
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Find Providers</span> ⚡';
    showToast('Failed to analyze prompt. Please try again.', 'error');
  }
}

// AI Clarification handling
async function handleClarification(originalPrompt, answers) {
  try {
    const res = await fetch('/api/ai/clarify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalPrompt,
        answers: [answers],
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude
      })
    });

    const data = await res.json();
    renderIntentCard(data.intent);
    renderProviders(data.matchedProviders || []);
    showToast('Intent refined! Provider ranking updated.', 'success');
  } catch (err) {
    showToast('Failed to refine intent.', 'error');
  }
}

// Render AI Intent Output Card
function renderIntentCard(intent) {
  const section = document.getElementById('intentResultSection');
  section.style.display = 'block';

  document.getElementById('intentCategoryBadge').innerText = intent.categoryName || 'Custom Request';
  document.getElementById('intentConfidenceBadge').innerText = `${Math.round(intent.confidence * 100)}% Confidence`;
  
  const urgencyBadge = document.getElementById('intentUrgencyBadge');
  urgencyBadge.className = `urgency-badge ${intent.urgency}`;
  urgencyBadge.innerText = `${intent.urgency} PRIORITY`;

  document.getElementById('intentCategoryName').innerText = intent.categoryName || 'Multi-Category';
  document.getElementById('intentPriceRange').innerText = `₹${intent.estimatedPrice.min} - ₹${intent.estimatedPrice.max} (${intent.estimatedPrice.unit})`;
  document.getElementById('intentUrgencyReason').innerText = intent.urgencyReason;

  // Clarification box if needed
  const clarBox = document.getElementById('clarificationBox');
  if (intent.needsClarification && intent.clarificationQuestions && intent.clarificationQuestions.length > 0) {
    clarBox.style.display = 'block';
    document.getElementById('clarificationQuestionText').innerText = intent.clarificationQuestions[0];
  } else {
    clarBox.style.display = 'none';
  }

  section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Render Matched Providers Grid
function renderProviders(providers) {
  currentMatchedProviders = providers;
  const grid = document.getElementById('providersGrid');
  grid.innerHTML = '';

  const badge = document.getElementById('matchCountBadge');
  badge.innerText = `(${providers.length} Verified Pros Nearby)`;

  if (providers.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
        <p style="font-size: 16px; color: var(--text-secondary); margin-bottom: 10px;">No exact providers found matching this category nearby.</p>
        <button class="match-btn" onclick="loadInitialProviders()" style="margin: 0 auto;">Browse All Available Pros</button>
      </div>
    `;
    return;
  }

  providers.forEach((p, index) => {
    const card = document.createElement('div');
    card.className = `provider-card ${index === 0 ? 'top-match' : ''}`;

    const score = p.matchScore || 90;
    const distanceKm = p.distanceKm || 3.2;
    const eta = p.estimatedEtaMinutes || 15;
    const price = p.servicePrice || p.hourly_rate || 350;

    const badgesHtml = (p.badges || ['Verified Pro ⭐', 'Nearby 📍'])
      .map(b => `<span class="badge-tag">${b}</span>`)
      .join('');

    card.innerHTML = `
      <div>
        <div class="provider-header">
          <img src="${p.avatarUrl || p.avatar_url || 'https://via.placeholder.com/150'}" class="provider-img" alt="${p.name}">
          <div class="provider-meta">
            <h3>${p.name} <span class="verified-icon" title="Verified Professional">✓</span></h3>
            <div class="provider-rating">
              <span class="rating-star">⭐</span>
              <strong>${p.rating || 4.9}</strong>
              <span>(${p.reviewCount || p.review_count || 12} reviews)</span>
              <span>•</span>
              <span>${p.experienceYears || p.experience_years || 5} yrs exp</span>
            </div>
            <div style="font-size: 12px; color: var(--accent-cyan); margin-top: 2px;">
              📍 ${distanceKm} km away • ⏱️ ~${eta} min ETA
            </div>
          </div>
        </div>

        <p class="provider-bio">${p.bio || 'Experienced service technician ready for on-demand booking.'}</p>

        <div class="provider-badges">
          ${badgesHtml}
        </div>

        <div class="score-breakdown">
          <div class="score-header">
            <span>AI Match Fit</span>
            <strong style="color: var(--accent-cyan);">${score}%</strong>
          </div>
          <div class="score-progress">
            <div class="score-bar" style="width: ${score}%;"></div>
          </div>
          <div class="score-factors">
            <span>Proximity: High</span>
            <span>Skill: 100%</span>
            <span>Reliability: 98%</span>
          </div>
        </div>
      </div>

      <div class="provider-footer">
        <div class="provider-price">
          Estimated: <span>₹${price}</span>
        </div>
        <button class="book-btn" onclick="openBookingModal('${p.providerId || p.id}', '${p.name}', '${price}', '${p.avatarUrl || p.avatar_url || ''}')">
          Book Instantly ⚡
        </button>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Open Booking Modal
function openBookingModal(providerId, providerName, price, avatarUrl) {
  const provider = currentMatchedProviders.find(p => (p.providerId || p.id) === providerId) || {
    providerId,
    name: providerName,
    avatarUrl,
    servicePrice: price
  };

  document.getElementById('modalProviderId').value = providerId;
  document.getElementById('modalCategoryId').value = provider.categoryId || 'cat-plumbing';
  document.getElementById('modalProviderName').innerText = provider.name || providerName;
  document.getElementById('modalProviderImg').src = provider.avatarUrl || avatarUrl || 'https://via.placeholder.com/150';
  document.getElementById('modalEstPrice').innerText = `₹${price}`;

  const promptVal = document.getElementById('promptInput').value.trim();
  document.getElementById('modalRequirement').value = promptVal || 'General service requirement';

  openModal('bookingModal');
}

// Handle Create Booking Request
async function handleCreateBooking(e) {
  e.preventDefault();

  const providerId = document.getElementById('modalProviderId').value;
  const categoryId = document.getElementById('modalCategoryId').value || 'cat-plumbing';
  const description = document.getElementById('modalRequirement').value;
  const address = document.getElementById('modalAddress').value;
  const urgency = document.getElementById('modalUrgency').value;
  const estPrice = parseInt(document.getElementById('modalEstPrice').innerText.replace('₹', '')) || 400;

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: currentUser.id,
        providerId,
        categoryId,
        description,
        rawPrompt: document.getElementById('promptInput').value,
        urgency,
        address,
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        estimatedPrice: estPrice
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    currentBooking = data.booking;
    closeModal('bookingModal');
    updateActiveTrackerBar();
    openTrackingModal();
    showToast('Booking dispatched! Provider has 90s to accept.', 'success');

    // Join real-time socket room for this booking
    if (socket) {
      socket.emit('join_booking', currentBooking.id);
    }
  } catch (err) {
    showToast(`Booking failed: ${err.message}`, 'error');
  }
}

// Active Booking Sticky Bar Management
function updateActiveTrackerBar() {
  const bar = document.getElementById('activeBookingBar');
  if (!currentBooking || currentBooking.status === 'CANCELLED') {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  document.getElementById('trackerCategoryIcon').innerText = currentBooking.category_icon || '🛠️';
  document.getElementById('trackerCategoryName').innerText = currentBooking.category_name || 'Service Booking';
  
  const statusBadge = document.getElementById('trackerStatusBadge');
  statusBadge.className = `urgency-badge ${currentBooking.status === 'URGENT' ? 'URGENT' : 'MEDIUM'}`;
  statusBadge.innerText = currentBooking.status;

  const subtitle = document.getElementById('trackerSubtitle');
  if (currentBooking.status === 'OFFERED') {
    subtitle.innerHTML = `Lead offered to <strong>${currentBooking.provider_name || 'Provider'}</strong> (Awaiting acceptance)`;
  } else if (currentBooking.status === 'ACCEPTED') {
    subtitle.innerHTML = `Assigned Provider: <strong>${currentBooking.provider_name || 'Provider'}</strong> accepted the booking`;
  } else if (currentBooking.status === 'EN_ROUTE') {
    subtitle.innerHTML = `<strong>${currentBooking.provider_name || 'Provider'}</strong> is on the way to your location`;
  } else if (currentBooking.status === 'IN_PROGRESS') {
    subtitle.innerHTML = `Service in progress at your address`;
  } else if (currentBooking.status === 'COMPLETED') {
    subtitle.innerHTML = `Service completed! Please complete payment & review`;
  }
}

// Open Tracking Modal
function openTrackingModal() {
  if (!currentBooking) return;
  updateTrackingModalUI();
  openModal('trackingModal');
}

// Update Tracking Modal Elements & Timeline
function updateTrackingModalUI() {
  if (!currentBooking) return;

  document.getElementById('trackingModalId').innerText = `Booking #${currentBooking.id.toUpperCase()}`;
  document.getElementById('trackingProviderName').innerText = currentBooking.provider_name || 'Assigned Provider';
  document.getElementById('trackingProviderAvatar').src = currentBooking.provider_avatar || 'https://via.placeholder.com/150';
  document.getElementById('trackingProviderPhone').innerText = `📞 Masked: ${currentBooking.provider_phone || '+91 98450-XXXXX'}`;

  // Stepper timeline
  const statuses = ['REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED'];
  const curIdx = statuses.indexOf(currentBooking.status);
  
  const nodes = ['stepNodeRequested', 'stepNodeAccepted', 'stepNodeEnRoute', 'stepNodeInProgress', 'stepNodeCompleted'];
  nodes.forEach((nodeId, idx) => {
    const el = document.getElementById(nodeId);
    const circle = el.querySelector('div');
    if (idx <= (curIdx >= 0 ? curIdx : 0)) {
      circle.style.background = '#6366f1';
      circle.style.color = '#fff';
    } else {
      circle.style.background = 'rgba(255,255,255,0.1)';
      circle.style.color = 'var(--text-secondary)';
    }
  });

  const progressLine = document.getElementById('progressLine');
  const percent = Math.max(0, Math.min(100, (curIdx / 4) * 100));
  progressLine.style.width = `${percent}%`;

  // Action buttons visibility
  const cancelBtn = document.getElementById('cancelBookingBtn');
  const payBtn = document.getElementById('payNowBtn');
  const reviewBtn = document.getElementById('reviewNowBtn');

  if (currentBooking.status === 'COMPLETED') {
    cancelBtn.style.display = 'none';
    payBtn.style.display = 'inline-block';
    reviewBtn.style.display = 'inline-block';
  } else if (currentBooking.status === 'CANCELLED') {
    cancelBtn.style.display = 'none';
    payBtn.style.display = 'none';
    reviewBtn.style.display = 'none';
  } else {
    cancelBtn.style.display = 'inline-block';
    payBtn.style.display = 'none';
    reviewBtn.style.display = 'none';
  }
}

// Cancel Booking
async function handleCancelBooking() {
  if (!currentBooking) return;
  if (!confirm('Are you sure you want to cancel this booking?')) return;

  try {
    const res = await fetch(`/api/bookings/${currentBooking.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Customer requested cancellation' })
    });
    const data = await res.json();
    currentBooking = data.booking;
    updateActiveTrackerBar();
    updateTrackingModalUI();
    showToast('Booking cancelled', 'warning');
  } catch (err) {
    showToast('Failed to cancel booking', 'error');
  }
}

// Chat Drawer Logic
function openChatDrawer() {
  if (!currentBooking) return;
  document.getElementById('chatHeaderName').innerText = currentBooking.provider_name || 'Service Provider';
  document.getElementById('chatDrawer').classList.add('open');
  loadChatMessages(currentBooking.id);
}

function closeChatDrawer() {
  document.getElementById('chatDrawer').classList.remove('open');
}

async function loadChatMessages(bookingId) {
  try {
    const res = await fetch(`/api/bookings/${bookingId}`);
    const data = await res.json();
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';

    if (data.messages && data.messages.length > 0) {
      data.messages.forEach(msg => appendChatMessage(msg));
    } else {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); font-size: 12px; margin-top: 20px;">
          🔒 Masked Secure Communication<br>Chat directly with your assigned provider.
        </div>
      `;
    }
  } catch (err) {
    console.error('Failed to load messages:', err);
  }
}

function appendChatMessage(msg) {
  const container = document.getElementById('chatMessages');
  const isCust = msg.sender_role === 'CUSTOMER' || msg.senderRole === 'CUSTOMER';
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${isCust ? 'customer' : 'provider'}`;
  bubble.innerHTML = `
    <div>${msg.content}</div>
    <div class="chat-bubble-time">${new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
  `;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function handleSendMessage(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const content = input.value.trim();
  if (!content || !currentBooking || !socket) return;

  socket.emit('send_message', {
    bookingId: currentBooking.id,
    senderId: currentUser.id,
    senderName: currentUser.name,
    senderRole: 'CUSTOMER',
    content
  });

  input.value = '';
}

// Payment Modal Logic
function openPaymentModal() {
  if (!currentBooking) return;
  const amount = currentBooking.final_price || currentBooking.estimated_price || 450;
  document.getElementById('receiptServiceAmount').innerText = `₹${amount}`;
  document.getElementById('receiptTotalAmount').innerText = `₹${amount}`;
  openModal('paymentModal');
}

async function handleProcessPayment() {
  if (!currentBooking) return;
  const btn = document.getElementById('confirmPaymentBtn');
  btn.disabled = true;
  btn.innerText = 'Processing Escrow Settlement...';

  try {
    const method = document.getElementById('paymentMethodSelect').value;
    const res = await fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: currentBooking.id,
        paymentMethod: method,
        amount: currentBooking.final_price || currentBooking.estimated_price
      })
    });
    const data = await res.json();
    btn.disabled = false;
    btn.innerText = 'Pay Securely (Escrow Protected) ✓';
    closeModal('paymentModal');
    showToast(`Payment of ₹${data.payment.amount} settled successfully!`, 'success');
  } catch (err) {
    btn.disabled = false;
    btn.innerText = 'Pay Securely (Escrow Protected) ✓';
    showToast('Payment failed', 'error');
  }
}

// Review Modal Logic
function openReviewModal() {
  if (!currentBooking) return;
  document.getElementById('reviewProviderName').innerText = currentBooking.provider_name || 'Your Provider';
  openModal('reviewModal');
}

async function handleSubmitReview() {
  if (!currentBooking) return;
  const comment = document.getElementById('reviewComment').value.trim();

  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: currentBooking.id,
        customerId: currentUser.id,
        rating: currentSelectedRating,
        comment
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    closeModal('reviewModal');
    showToast('Thank you for rating your service provider! ⭐', 'success');
  } catch (err) {
    showToast(`Review submission: ${err.message}`, 'warning');
  }
}

// User Switcher Modal Logic
async function openUserSwitcher() {
  try {
    const res = await fetch('/api/auth/demo-users');
    const data = await res.json();
    const list = document.getElementById('demoUserList');
    list.innerHTML = '';

    data.users.forEach(u => {
      const item = document.createElement('div');
      item.style = `display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3); padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); cursor: pointer; transition: var(--transition-smooth);`;
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${u.avatar_url}" style="width: 32px; height: 32px; border-radius: 50%;">
          <div>
            <h4 style="font-size: 14px;">${u.name}</h4>
            <p style="font-size: 11px; color: var(--text-muted);">${u.email} • ${u.role}</p>
          </div>
        </div>
        <span class="badge-tag" style="background: ${u.role === 'CUSTOMER' ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)'};">${u.role}</span>
      `;
      item.addEventListener('click', () => {
        currentUser = {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          avatarUrl: u.avatar_url,
          role: u.role
        };
        document.getElementById('navUserName').innerText = u.name;
        document.getElementById('navUserAvatar').src = u.avatar_url;
        closeModal('userModal');
        showToast(`Switched user to ${u.name}`, 'info');
        checkActiveBooking();
      });
      list.appendChild(item);
    });

    openModal('userModal');
  } catch (err) {
    console.error('Failed to load demo users:', err);
  }
}

// Check for recent active booking for current customer
async function checkActiveBooking() {
  try {
    const res = await fetch(`/api/bookings/customer/${currentUser.id}`);
    const data = await res.json();
    if (data.bookings && data.bookings.length > 0) {
      const active = data.bookings.find(b => ['OFFERED', 'ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS'].includes(b.status));
      if (active) {
        currentBooking = active;
        updateActiveTrackerBar();
        if (socket) {
          socket.emit('join_booking', currentBooking.id);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to check active booking:', err);
  }
}

// Modal Utility Helpers
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}
