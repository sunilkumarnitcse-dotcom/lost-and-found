// ItemReport ADT — validateItem().
// Returns true only when every mandatory field is present and valid.
// No report is created by this function.
function validateItem(body) {
  const errors = [];
  const required = (field, label) => {
    if (!body[field] || String(body[field]).trim() === '') {
      errors.push(`${label} is required.`);
    }
  };

  required('title', 'Item name');
  required('category', 'Category');
  required('location', 'Location');
  required('description', 'Description');
  required('reporterName', 'Your name');
  required('reporterContact', 'Your contact details');

  if (!body.type || !['lost', 'found'].includes(body.type)) {
    errors.push('Type must be lost or found.');
  }
  if (!body.date || Number.isNaN(Date.parse(body.date))) {
    errors.push('A valid date is required.');
  } else if (new Date(body.date) > new Date()) {
    errors.push('Date cannot be in the future.');
  }
  if (body.title && String(body.title).length > 120) {
    errors.push('Item name must be 120 characters or less.');
  }
  if (body.description && String(body.description).length > 2000) {
    errors.push('Description must be 2000 characters or less.');
  }
  if (body.photoRef && String(body.photoRef).length > 700000) {
    errors.push('Photo is too large. Please choose a smaller photo.');
  }
  if (body.photoRef && !String(body.photoRef).startsWith('data:image/') && !/^https?:\/\//.test(String(body.photoRef))) {
    errors.push('Photo must be an uploaded image or a link.');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateItem };
