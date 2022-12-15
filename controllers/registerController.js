const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const knex = require('../config/pgConn');

const handleNewUser = async (req, res) => {
  const { user, pwd } = req.body;
  if (!user || !pwd) return res.sendStatus(400);

  const data = await knex.select('*').from('users').where('name', user);
  if (data.length != 0) {
    console.log('duplicate username');
    return res.sendStatus(409)
  }
  try {
    const hashedPwd = await bcrypt.hash(pwd, 10);

    const accessToken = jwt.sign(
      { "username": user },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '30s' }
    );

    const refreshToken = jwt.sign(
      { "username": user },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '1d' }
    );

    const newUser = {
      name: user,
      password: hashedPwd,
      refresh_token: refreshToken
    };

    const result = await knex.insert(newUser).into('users')
    console.log(`User ${user} Inserted!`);

    res.cookie('jwt', refreshToken, { httpOnly: true, sameSite: 'None', secure: true, maxAge: 24 * 60 * 60 * 1000 });
    res.json({ accessToken });
  } catch (err) {
    console.log(err.message);
    return res.sendStatus(500)
  }
};

module.exports = { handleNewUser }
