// Minimal draft-07 validator covering only the keywords config/config.schema.json
// actually uses (type, required, properties, items/additionalItems, enum, pattern,
// minLength, minItems, dependencies, $ref, allOf). Not a general-purpose JSON
// Schema engine - deliberately scoped to this one schema so the editor has no
// runtime dependency on a library like ajv.
export function validateConfig(schema, data) {
  const errors = [];
  validateNode(schema, data, '', schema, errors);
  return errors;
}

function resolveRef(ref, root) {
  const parts = ref.replace(/^#\//, '').split('/');
  return parts.reduce((node, key) => node?.[key], root);
}

function checkType(type, value) {
  switch (type) {
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'integer':
      return Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    default:
      return true;
  }
}

function validateNode(schema, data, path, root, errors) {
  if (schema.$ref) {
    validateNode(resolveRef(schema.$ref, root), data, path, root, errors);
    return;
  }
  if (schema.allOf) {
    schema.allOf.forEach((sub) => validateNode(sub, data, path, root, errors));
    return;
  }

  if (data === undefined) {
    // presence is checked by the parent via `required`, not here
    return;
  }

  if (schema.type && !checkType(schema.type, data)) {
    errors.push({ path: path || '/', message: `must be of type ${schema.type}` });
    return;
  }

  if (schema.enum && !schema.enum.includes(data)) {
    errors.push({ path: path || '/', message: `must be one of: ${schema.enum.join(', ')}` });
  }

  if (schema.pattern && typeof data === 'string' && !new RegExp(schema.pattern).test(data)) {
    errors.push({ path: path || '/', message: `must match pattern ${schema.pattern}` });
  }

  if (schema.minLength !== undefined && typeof data === 'string' && data.length < schema.minLength) {
    errors.push({ path: path || '/', message: `must be at least ${schema.minLength} characters` });
  }

  if (schema.minItems !== undefined && Array.isArray(data) && data.length < schema.minItems) {
    errors.push({ path: path || '/', message: `must have at least ${schema.minItems} items` });
  }

  if (schema.required && typeof data === 'object' && !Array.isArray(data)) {
    for (const key of schema.required) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) {
        errors.push({ path: `${path}/${key}`, message: 'is required' });
      }
    }
  }

  if (schema.dependencies && typeof data === 'object' && !Array.isArray(data)) {
    for (const [key, deps] of Object.entries(schema.dependencies)) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        for (const dep of deps) {
          if (!Object.prototype.hasOwnProperty.call(data, dep)) {
            errors.push({ path: path || '/', message: `'${key}' is present, so '${dep}' must be too` });
          }
        }
      }
    }
  }

  if (schema.properties && typeof data === 'object' && !Array.isArray(data)) {
    for (const key of Object.keys(schema.properties)) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        validateNode(schema.properties[key], data[key], `${path}/${key}`, root, errors);
      }
    }
  }

  if (Array.isArray(data) && schema.items) {
    if (Array.isArray(schema.items)) {
      data.forEach((item, i) => {
        const itemSchema = i < schema.items.length ? schema.items[i] : schema.additionalItems;
        if (itemSchema) validateNode(itemSchema, item, `${path}/${i}`, root, errors);
      });
    } else {
      data.forEach((item, i) => validateNode(schema.items, item, `${path}/${i}`, root, errors));
    }
  }
}
