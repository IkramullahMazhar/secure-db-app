// Use the promise-based version of mysql2
const mysql = require('mysql2/promise');

// Create a connection pool so the app can reuse MySQL connections
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',           // MySQL username
    password: '356D0278i!', // MySQL password
    database: 'assignment_db', // Database used for this assignment
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Simple check to make sure the database and table are available
async function checkDatabaseConnection() {
    try {
        // Get a connection from the pool
        const connection = await pool.getConnection();
        console.log('Connected to MySQL database.');

        // Run a light query to confirm mysql_table exists
        await connection.query('SELECT 1 FROM mysql_table LIMIT 1;');
        console.log('mysql_table exists and is accessible.');

        // Return the connection to the pool
        connection.release();
    } catch (err) {
        // Log any connection or schema problems
        console.error('Database connection or schema error:', err.message);
        // Re-throw so the calling code knows something went wrong
        throw err;
    }
}

// Export the pool and the check function so other files can use them
module.exports = {
    pool,
    checkDatabaseConnection
};
