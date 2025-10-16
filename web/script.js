const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('#primary-navigation');
const currentYearEl = document.querySelector('#current-year');

if (currentYearEl) {
  currentYearEl.textContent = new Date().getFullYear();
}

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!isExpanded));
    nav.classList.toggle('open');
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const contactForm = document.querySelector('.contact-form');

if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const submission = Object.fromEntries(formData.entries());

    console.table(submission);

    const button = contactForm.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Request received ✅';

    setTimeout(() => {
      button.disabled = false;
      button.textContent = originalText;
      contactForm.reset();
    }, 2600);
  });
}
