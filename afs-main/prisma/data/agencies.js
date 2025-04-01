// List of student IDs (or any other value)
// For every item in the below array, an agency (aka user) will be created with an API Key equal to the sha-256 hash of the item's value.
// That API Key could be used to authenticate all requests to the API.
const agencies = [
  "1009388155",
];

module.exports = {
  agencies,
};
