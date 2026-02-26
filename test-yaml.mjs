import yaml from 'js-yaml';
console.log('js-yaml loaded');
try {
  const doc = yaml.load('foo: bar');
  console.log(doc);
} catch (e) {
  console.log(e);
}
