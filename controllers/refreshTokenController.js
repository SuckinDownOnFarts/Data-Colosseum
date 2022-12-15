const jwt = require('jsonwebtoken');
const knex = require('../config/pgConn');



const handleRefreshToken = async (req, res) => {
  const cookies = req.cookies
  if (!cookies?.jwt) return res.sendStatus(401);

  console.log(cookies.jwt);

  const refreshToken = cookies.jwt;

  const foundUser = await knex.select('*').from('users').where('refresh_token', refreshToken);

  if (foundUser.length === 0) {
    return res.sendStatus(403) //Forbidden
  };
  //evaluate jwt
  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    (err, decoded) => {
      if (err || foundUser.name !== decoded.name) return res.sendStatus(403);
      const accessToken = jwt.sign(
        { "username": decoded.name },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '15m'}
      );
      res.json({ accessToken })
    }
  );
}

module.exports = { handleRefreshToken }
