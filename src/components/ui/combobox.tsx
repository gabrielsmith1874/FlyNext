// If this file exists and has a combobox component:

// ...existing code...

// Look for where selected items are rendered, for example:
// {selectedItems.map((item) => (
//   <div key={item.code || item}>{item}</div>  // Problem: trying to render an object directly
// ))}

// Fix by changing to:
// {selectedItems.map((item) => (
//   <div key={typeof item === 'object' ? item.code : item}>
//     {typeof item === 'object' ? `${item.code} - ${item.name}` : item}
//   </div>
// ))}
