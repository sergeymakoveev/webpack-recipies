const R = require('ramda');

const users = R.pipe(
    R.range(1),
    R.map(
        (id) => ({ id, login: `user${id}`, name: `User ${id}`, email: `user.${id}@example.com`, enabled: !!(id%2) })
    )
)(100)

const categories = R.pipe(
    R.range(1),
    R.map(
        (id) => ({ id, name: `Category ${id}`, enabled: !!(id % 2) })
    )
)(100)

const authorise = R.head(users);

module.exports = () => ({
    users,
    authorise,
    categories
});
