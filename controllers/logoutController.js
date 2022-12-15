const knex = require('../config/pgConn');

const handleLogout = async (req, res) => {
  // On client, also delete the access token

  const cookies = req.cookies
  if (!cookies?.jwt) return res.sendStatus(204); //no content

  const refreshToken = cookies.jwt;

  const foundUser = await knex.select('*').from('users').where('refresh_token', refreshToken);
  if (foundUser.length === 0) {
    res.clearCookie('jwt', { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 })
    return res.sendStatus(204) //No content
  };
  //Delete refreshToken in PG

  const deleteRefresh = await knex('users').where('refresh_token', refreshToken).update('refresh_token', null)

  res.clearCookie('jwt', { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }) //secure: true - only serves on https
  res.sendStatus(204);
  console.log("User logged out");
}

module.exports = { handleLogout }
