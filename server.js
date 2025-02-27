import express from 'express';
import pkg from 'pg';  // Import the pg package as a default export
const { Client } = pkg;
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import puppeteer from 'puppeteer';

const app = express();

// PostgreSQL Database connection
const db = new Client({
  host: 'dpg-cuuk675ds78s73b07i80-a',  // Your PostgreSQL host
  port: 5432,                          // Default PostgreSQL port
  user: 'loyola_4znl_user',                       // Your PostgreSQL user
  password: 'd7kytjitiwAsqES504tjCdBn7tkJPGwH', // Your PostgreSQL password
  database: 'loyola_4znl'                   // Your PostgreSQL database name
});

db.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => console.error('Error connecting to PostgreSQL:', err));

const corsOptions = {
    origin: 'https://loyolapolytechnicysrr.onrender.com',
    
};

app.use(cors(corsOptions));
app.use(bodyParser.json()); // Make sure to use bodyParser here

// Route to get all images
app.get('/api/images', async (req, res) => {
    try {
      // Query to fetch all image data and their IDs from the database
      const query = 'SELECT id, caption FROM images';
      const result = await db.query(query);
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'No images found' });
      }
  
      // Send the list of images with their IDs and captions
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching images:', error);
      res.status(500).json({ message: 'Error fetching images' });
    }
  });
 app.get('/api/images/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      // Fetch image from the database by ID
      const query = 'SELECT * FROM images WHERE id = $1';
      const result = await db.query(query, [id]);
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Image not found' });
      }
  
      const image = result.rows[0].imagedata;
      res.set('Content-Type', 'image/jpeg'); // You can adjust based on the image format
      res.send(image); // Send the image binary as a response
    } catch (error) {
      console.error('Error fetching image:', error);
      res.status(500).json({ message: 'Error fetching image' });
    }
  });






app.get('/api/notifications', (req, res) => {
  const query = 'SELECT id, notify FROM notifications';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching data from database', err);
      return res.status(500).json({ error: 'Failed to fetch data' });
    }

    // Ensure the result is an array of notifications, even if it's a single row
    const notifications = results.rows.length > 0 ? results.rows : [];

    res.json(notifications); 
  });
});
app.delete('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM notifications WHERE id = $1';

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error deleting notification', err);
      return res.status(500).json({ error: 'Failed to delete notification' });
    }
    console.log('Notification deleted successfully');
    res.status(200).json({ message: 'Notification deleted' });
  });
});



// Route to get notifications
app.get('/api/notifications', (req, res) => {
  const query = 'SELECT id, notify FROM notifications';

  db.query(query)
    .then(results => {
      res.json(results.rows);
    })
    .catch(err => {
      console.error('Error fetching data from PostgreSQL:', err);
      return res.status(500).json({ error: 'Failed to fetch data' });
    });
});

// Route to delete a notification
app.delete('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM notifications WHERE id = $1';

  db.query(query, [id])
    .then(results => {
      console.log('Notification deleted successfully');
      res.status(200).json({ message: 'Notification deleted' });
    })
    .catch(err => {
      console.error('Error deleting notification:', err);
      return res.status(500).json({ error: 'Failed to delete notification' });
    });
});

// Route to insert a new row into notifications
app.post('/api/insert-row', (req, res) => {
  const { notify } = req.body;

  if (!notify) {
    return res.status(400).json({ error: 'Notify field is required' });
  }

  const query = 'INSERT INTO notifications (notify) VALUES ($1)';
  db.query(query, [notify])
    .then(result => {
      res.status(200).json({ message: 'Row inserted successfully', data: result });
    })
    .catch(err => {
      console.error('Error inserting data:', err);
      return res.status(500).json({ error: 'Database error' });
    });
});

// File upload setup using multer
const storage = multer.memoryStorage();
const upload = multer({ storage });
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
      if (!req.file || !req.body.caption) {
        return res.status(400).json({ message: 'Image and caption are required.' });
      }
  
      const { caption } = req.body;
      const image = req.file.buffer; // Image data as binary buffer
  
      // Store image in the database (you can store image in bytea field)
      const query = 'INSERT INTO images (caption, imagedata) VALUES ($1, $2) RETURNING id';
      const values = [caption, image];
  
      const result = await db.query(query, values);
      const imageId = result.rows[0].id;
  
      // Generate a response with image URL (or ID)
      res.status(201).json({
        message: 'Image uploaded successfully!',
        imageUrl: `https://https://backend-upqj.onrender.com/api/images/${imageId}`
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ message: 'Error uploading image' });
    }
  });
  
// Route to handle user login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password])
    .then(results => {
      if (results.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const user = results.rows[0];

      const token = jwt.sign({ userId: user.username }, 'your_jwt_secret', { expiresIn: '1h' });

      res.json({ message: 'Login successful', token });
    })
    .catch(err => {
      console.error('Error during login:', err);
      return res.status(500).json({ message: 'Server error' });
    });
});

// Fetching marks for students
app.post('/api/marks', async (req, res) => {
  const { start, end, sem } = req.body;
  const startPin = parseInt((start.slice(-3)), 10);
  const endPin = parseInt((end.slice(-3)), 10);
  const basePin = start.slice(0, 9);

  try {
    const dic = [];
    for (let i = startPin; i <= endPin; i++) {
      let k = i.toString().padStart(3, '0');
      dic.push({
        pin: `${basePin}${k}`,
        sem
      });
    }
 const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const results = [];

    for (const value of dic) {
      await page.goto('https://sbtet.ap.gov.in/APSBTET/results.do');
      await page.type('#aadhar1', value.pin);
      await page.type('#grade2', value.sem);
      await page.click('.btn.btn-primary');
      await page.waitForNavigation();

      let pin, branch, name, arr = [];

      const res = await page.$$eval('#d', (elements) => elements.length > 0);

      if (res) {
        const msgElement = await page.$('#msg');
        if (msgElement) {
          pin = value.pin;
          arr = [{ message: 'not registered' }];
          branch = '';
          name = '';
        } else {
          const resultText = await page.$$eval('#altrowstable1 tbody tr', (rows) => {
            return rows.map(row => {
              const headers = Array.from(row.querySelectorAll('th')).map(header => header.innerHTML.trim());
              const cells = Array.from(row.querySelectorAll('td')).map(cell => cell.innerHTML.trim());
              return { headers, cells };
            });
          });

          pin = String(resultText[0].cells[0]);
          name = String(resultText[1].cells[0]);
          branch = String(resultText[2].cells[0]);

          resultText.forEach((value, index) => {
            if (index >= 4) {
              const dic = {
                subcode: value.headers[0],
                marks: value.cells,
              };
              arr.push(dic);
            }
          });
        }
      }

      const student = {
        pin,
        name,
        course: branch,
        semester: sem,
        marks: arr,
      };

      results.push(student);

      const marksJson = JSON.stringify(student.marks);
      const query = `
        INSERT INTO student (pinnumber, name, branch, semester, marks)
        VALUES ($1, $2, $3, $4, $5)
      `;
      db.query(query, [pin, name, branch, sem, marksJson])
        .catch(err => console.error('Error inserting data:', err));
    }

    res.status(200).json(results);

    await browser.close();
  } catch (error) {
    console.error('Error during scraping:', error);
    res.status(500).json({ error: 'Failed to scrape results' });
  }
});

// Get all students
app.get('/api/students', (req, res) => {
  db.query("SELECT * FROM student WHERE name != ''")
    .then(results => {
      res.json(results.rows);
    })
    .catch(err => {
      res.status(500).json({ error: 'Error fetching data' });
    });
});







app.post('/api/signup', async (req, res) => {
  const { hallTicket, name, password } = req.body;

  // Basic Validation (also do this in the frontend)
  if (!hallTicket || !name || !password) {
      return res.status(400).json({ message: 'Please fill in all the fields.' });
  }

  try {
      // Check if the hall ticket already exists
      const existingUser = await new Promise((resolve, reject) => {
          db.query('SELECT * FROM candidates WHERE hallTicket = ?', [hallTicket], (err, results) => { // Changed to 'candidates'
              if (err) {
                  reject(err);
              } else {
                  resolve(results);
              }
          });
      });

      if (existingUser.length > 0) {
          return res.status(409).json({ message: 'User with this Hall Ticket already exists.' });
      }

        // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert into the database with the hashed password
      const insertUser = await new Promise((resolve, reject) => {
          db.query(
              'INSERT INTO candidates (hallTicket,name, password ) VALUES (?, ?, ?)', // Changed to 'candidates'
              [hallTicket, name,hashedPassword], // Use hashedPassword here
              (err, result) => {
                  if (err) {
                      reject(err);
                  } else {
                      resolve(result);
                  }
              }
          );
      });

      res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'User with this Hall Ticket already exists.' });
      }
      console.error('Error in /api/signup:', error);
      res.status(500).json({ message: 'Failed to create user' });
  }
});












app.post('/api/candidates-login', (req, res) => {
  const { username, password } = req.body;

  // Check if the user exists in the 'candidates' table
  db.query('SELECT * FROM candidates WHERE hallTicket = ?', [username], async (err, results) => {
    if (err) {
      console.error('Error in /api/candidates-login:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const candidate = results[0];
    // Compare the entered password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, candidate.password);

    if (isMatch) {
      // Generate a JWT token
      const token = jwt.sign({ userId: candidate.hallTicket }, 'your_jwt_secret', { expiresIn: '1h' });
      res.json({ message: 'Login successful', loyolaToken: token }); // Use 'loyolaToken' here
    } else {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
  });
});














// In your server.js file

app.post('/api/submit-payment', (req, res) => {
  const { hallTicket, transactionId } = req.body;

  // Basic validation
  if (!hallTicket || !transactionId) {
    return res.status(400).json({ message: 'Hall Ticket and Transaction ID are required.' });
  }

  
  const query = 'INSERT INTO payments (hallTicket, transactionId) VALUES (?, ?)';
    db.query(query, [hallTicket, transactionId], (err, result) => {
        if (err) {
            console.error('Error inserting data into database:', err);
            return res.status(500).json({ message: 'Error submitting the payment' });
        }
        res.json({ message: 'payment submitted successfully'});
    });
});

//---------------------------------------------------------------------------------------------------------------------------------------------------------------------



app.get("/payments", (req, res) => {
  const sql = "SELECT * FROM Payments";
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// Delete a payment by hallTicket
app.delete("/payments/:hallTicket", (req, res) => {
  const { hallTicket } = req.params;
  const sql = "DELETE FROM Payments WHERE hallTicket = ?";
  db.query(sql, [hallTicket], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Payment deleted successfully" });
  });
});

// Confirm payment by moving hallTicket to Confirmpayments
app.post("/confirmPayment", (req, res) => {
  const { hallTicket } = req.body;

  // Insert into Confirmpayments table
  const insertSql = "INSERT INTO Confirmpayments (hallTicket) VALUES (?)";
  db.query(insertSql, [hallTicket], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Delete from Payment table after confirmation
    const deleteSql = "DELETE FROM Payment WHERE hallTicket = ?";
    db.query(deleteSql, [hallTicket], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Payment confirmed and moved successfully" });
    });
  });
});





app.post('/api/application', (req, res) => {
  const { hallTicket, marks, preferences } = req.body;

  // Basic validation
  if (!hallTicket || !marks || !preferences || preferences.length !== 6) {
    return res.status(400).json({ message: 'Hall Ticket , marks and all preferences are required.' });
  }
  if (new Set(preferences).size !== preferences.length) {
    return res.status(400).json({ message: 'Duplicate program preferences are not allowed.' });
  }
  // check if the payment is done or not
  const checkPaymentQuery = 'SELECT * FROM Confirmpayments WHERE hallTicket = ?';

  db.query(checkPaymentQuery, [hallTicket], (err, paymentResults) => {
    if (err) {
      console.error('Error checking payment status:', err);
      return res.status(500).json({ message: 'Error checking payment status' });
    }

    if (paymentResults.length === 0) {
      return res.status(400).json({ message: 'Payment not found for this hall ticket. Please complete the payment first.' });
    }
  // Here you would:
  // 1. Validate the data (e.g., check if hallTicket exists, etc.)
  // 2. Store the application information in your database (create a new table for applications if needed).
  // 3. Send a success response back to the client.
  // 4. Handle errors and send appropriate error messages.
  const query = 'INSERT INTO applications (hallTicket, marks, preference1, preference2, preference3, preference4, preference5, preference6) VALUES (?, ?, ?, ?, ?, ?,?,?)';
    db.query(query, [hallTicket, marks, preferences[0], preferences[1], preferences[2], preferences[3], preferences[4], preferences[5]], (err, result) => {
        if (err) {
            console.error('Error inserting data into database:', err);
            return res.status(500).json({ message: 'Error submitting the application' });
        }
        res.json({ message: 'Application submitted successfully'});
    });
  });
});










app.get("/api/results/:hallticketnumber", (req, res) => {
  const { hallticketnumber } = req.params;
  const query = "SELECT * FROM result WHERE hallticketnumber = ?";

  db.query(query, [hallticketnumber], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Database query error" });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Result not found" });
    }
    res.json(results[0]);
  });
});




app.get("/allocate", async (req, res) => {
  const branchLimits = {
    dcme: 30,
    dece: 30,
    deee: 30,
    dce: 30,
    dme: 30,
    dmng: 30,
  };
  
  const branchCounts = {
    dcme: 0,
    dece: 0,
    deee: 0,
    dce: 0,
    dme: 0,
    dmng: 0,
  };
  db.query("SELECT * FROM applications ORDER BY marks DESC", async (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    
    for (let row of rows) {
      const choices = [
        row.preference1,
        row.preference2,
        row.preference3,
        row.preference4,
        row.preference5,
        row.preference6,
      ].filter((branch) => branch !== "none");
      
      let allocated = false;
      for (let choice of choices) {
        if (branchCounts[choice] < branchLimits[choice]) {
          try {
            await new Promise((resolve, reject) => {
              db.query(
                "INSERT INTO results (hallTicket, branch) VALUES (?, ?)",
                [row.hallTicket, choice],
                (err, result) => {
                  if (err) return reject(err);
                  branchCounts[choice]++;
                  allocated = true;
                  resolve();
                }
              );
            });
            if (allocated) break;
          } catch (error) {
            console.error("Error allocating branch:", error);
          }
        }
      }
    }
    res.json({ message: "Allotted successfully" });
  });
});





const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
