// Illustrative copy and stock portraits, not verified customer endorsements.
export const testimonials = [
  ['Amelia Reed', 'Online retailer', 'International shipping', 'We were sending our first overseas order and had a lot of questions about the paperwork. Having someone explain what was needed, before collection, made the whole process feel much more manageable.', 'women/44'],
  ['Daniel Morgan', 'Operations coordinator', 'Road freight', 'Our delivery window was tight because the warehouse only accepts goods in the morning. The collection details were clear, and we knew who to speak to when we needed to check the arrival time.', 'men/32'],
  ['Grace Adams', 'Small business owner', 'Package delivery', 'What mattered most to me was getting an update without having to chase for one. A short message confirming collection and another when the parcel arrived made a real difference.', 'women/68'],
  ['Marcus Turner', 'Purchasing manager', 'Ocean freight', 'We had several cartons coming from the same supplier. Talking through the shipment size and the available options helped us choose a practical service instead of paying for speed we did not need.', 'men/46'],
  ['Sofia Lewis', 'Independent designer', 'Careful handling', 'The samples needed to arrive in good condition for a presentation. I appreciated being asked about the contents and packaging at the start, rather than finding out something was missing on collection day.', 'women/65'],
  ['James Owen', 'Retail store owner', 'Business deliveries', 'I was given a realistic delivery window and clear collection instructions. That helped me plan staffing at the shop and keep my own customers informed while we waited for the stock.', 'men/75'],
];

export function renderTestimonials() {
  return `<section id="testimonials" class="reviews-section" aria-labelledby="reviews-heading" aria-roledescription="carousel" x-data="{ currentReview: 0, reviews: 6, paused: false, hovering: false, focused: false }" data-carousel="reviews" @mouseenter="hovering = true" @mouseleave="hovering = false" @focusin="focused = true" @focusout="focused = $el.contains($event.relatedTarget)">
    <div class="reviews-container">
      <div class="reviews-heading"><span class="reviews-eyebrow">THE CUSTOMER EXPERIENCE</span><h2 id="reviews-heading">Every shipment has a story.</h2><p>Clear communication. Careful handling. Support along the way.</p><p class="reviews-disclosure">Sample testimonials with illustrative names and stock portraits. These are not verified customer reviews.</p></div>
      <div class="reviews-stage" :aria-live="paused || focused ? 'polite' : 'off'">
      ${testimonials.map(([name, role, service, quote], i) => `<article class="review-slide" x-show="currentReview === ${i}" ${i ? 'x-cloak' : ''} x-transition.opacity.duration.350ms aria-roledescription="slide" aria-label="${i + 1} of 6">
        <div class="review-photo"><img src="/testimonials/portrait-${i + 1}.jpg" alt="Stock portrait illustrating this sample testimonial" width="400" height="400"></div>
        <div class="review-copy"><span class="review-service">${service}</span><span class="review-quote-mark" aria-hidden="true">“</span><blockquote>${quote}</blockquote><div class="review-person"><strong>${name}</strong><span>${role} · Illustrative profile</span></div></div>
      </article>`).join('')}
      </div>
      <div class="review-controls"><div class="review-arrows"><button type="button" aria-label="Previous testimonial" @click="currentReview = (currentReview + reviews - 1) % reviews; paused = true">←</button><button type="button" aria-label="Next testimonial" @click="currentReview = (currentReview + 1) % reviews; paused = true">→</button></div><div class="review-dots" aria-label="Choose testimonial">${testimonials.map((_, i) => `<button type="button" aria-label="Show testimonial ${i + 1}" :aria-pressed="currentReview === ${i}" :class="{ 'is-active': currentReview === ${i} }" @click="currentReview = ${i}; paused = true"></button>`).join('')}</div><button class="review-play" type="button" @click="paused = !paused" :aria-label="paused ? 'Play testimonials' : 'Pause testimonials'" x-text="paused ? 'Play slideshow' : 'Pause slideshow'">Pause slideshow</button></div>
    </div>
  </section>`;
}
