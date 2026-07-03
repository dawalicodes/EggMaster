const React = require('react');
const children = [
  React.createElement('option', { value: '1' }, 'One'),
  [
    React.createElement('option', { value: '2' }, 'Two'),
    React.createElement('option', { value: '3' }, 'Three')
  ]
];
console.log(React.Children.toArray(children));
