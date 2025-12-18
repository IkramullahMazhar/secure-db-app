const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',           // change if needed
    password: '356D0278i!', // your password
    database: 'assignment_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function checkDatabaseConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to MySQL database.');

        await connection.query('SELECT 1 FROM mysql_table LIMIT 1;');
        console.log('mysql_table exists and is accessible.');

        connection.release();
    } catch (err) {
        console.error('Database connection or schema error:', err.message);
        throw err;
    }
}

module.exports = {
    pool,
    checkDatabaseConnection
};
