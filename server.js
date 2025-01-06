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
  host: 'dpg-ctsvjpt2ng1s73c4hj60-a',  // Your PostgreSQL host
  port: 5432,                          // Default PostgreSQL port
  user: 'madan',                       // Your PostgreSQL user
  password: 'Z1nZOolhskYB6k1Rum1xHxXMHFms5R9y', // Your PostgreSQL password
  database: 'loyola'                   // Your PostgreSQL database name
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
app.get('/images', (req, res) => {
  const query = 'SELECT * FROM images'; 
  

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error retrieving images from MySQL:', err);
      return res.status(500).send('Error retrieving images.');
    }

    if (results.length === 0) {
      return res.status(404).send('No images found.');
    }

    
    const images = results.rows.map(image => ({
      imageUrl: `https://backend-upqj.onrender.com/image/${image.id}`,  
      caption: image.caption
    }));

    
    res.json(images);
  });
});

// Route to get an individual image by ID
app.get('/image/:id', (req, res) => {
  const imageId = req.params.id;  // Get the image ID from the URL parameter

  const query = 'SELECT  imageData, caption FROM images WHERE id = $1';
  db.query(query, [imageId], (err, results) => {
    if (err) {
      console.error('Error retrieving image from MySQL:', err);
      return res.status(500).send('Error retrieving image.');
    }

    if (results.rows.length === 0) {
      return res.status(404).send('Image not found.');
    }

    const image = results.rows[0];
    res.contentType('image/jpeg');
    res.send(image.imageData);
  });
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
  const query = 'DELETE FROM notifications WHERE id = ?';

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
const storage = multer.memoryStorage(); // Store image in memory as binary data
const upload = multer({ storage });

// Route to upload an image
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file || !req.body.caption) {
    return res.status(400).json({ message: 'Please provide both an image and a caption' });
  }

  const imageData = req.file.buffer; // The binary data of the image
  const caption = req.body.caption;  // The caption for the image

  // Modify the query to include RETURNING id
  const query = 'INSERT INTO images (caption, imageData) VALUES ($1, $2) RETURNING id';

  db.query(query, [caption, imageData])
    .then(result => {
      // Assuming the result is an array and we are retrieving the first row's id
      res.json({ message: 'Image uploaded successfully', imageId: result.rows[0].id });
    })
    .catch(err => {
      console.error('Error inserting data into PostgreSQL:', err);
      return res.status(500).json({ message: 'Error uploading image' });
    });
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
 const browser = await puppeteer.launch({
  headless: true,
  executablePath: puppeteer.executablePath(),  // Automatically points to the bundled Chromium
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ],
});
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
