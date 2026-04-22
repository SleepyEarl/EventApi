const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors'); 
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `event-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage: storage });

let events = [
  {
    id: 1,
    title: "CCS DAYS",
    date: Date.now(),
    description: "GENSHIN THEME"
  },
];
let registrations = [];

// ROOT
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: "API is active" });
});

// GET ALL EVENTS
app.get('/api/events', (req, res) => {
  res.status(200).json({ success: true, data: events });
});

// GET SINGLE EVENT
app.get('/api/events/:id', (req, res) => {
  const event = events.find((e) => e.id == req.params.id); // Changed to == to handle string/number mismatch
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  res.status(200).json({ success: true, data: event });
});

// POST: JOIN EVENT
app.post('/api/events/:id/join', (req, res) => {
  const { userName } = req.body;
  const eventId = req.params.id;

  if (!userName) return res.status(400).json({ success: false, message: 'User name is required in JSON body' });

  const registration = { id: Date.now(), eventId: eventId, userName, joinedAt: new Date() };
  registrations.push(registration);
  res.status(201).json({ success: true, message: `Successfully joined event!` });
});

// ADMIN POST: CREATE EVENT (Use Form-Data in Postman)
app.post('/api/admin/events', upload.single('eventImage'), (req, res) => {
  const { title, date, description } = req.body;
  if (!title || !date) return res.status(400).json({ success: false, message: 'Title and Date are required' });

  const newEvent = {
    id: Date.now(),
    title,
    date,
    description: description || '',
    imagePath: req.file ? `/uploads/${req.file.filename}` : null,
  };

  events.push(newEvent);
  res.status(201).json({ success: true, data: newEvent });
});

// ADMIN PUT: UPDATE EVENT (Newly Added)
app.put('/api/admin/events/:id', upload.single('eventImage'), (req, res) => {
    const eventIndex = events.findIndex(e => e.id == req.params.id);
    if (eventIndex === -1) return res.status(404).json({ success: false, message: "Event not found" });

    const { title, date, description } = req.body;
    
    // Update fields if provided
    if (title) events[eventIndex].title = title;
    if (date) events[eventIndex].date = date;
    if (description) events[eventIndex].description = description;
    if (req.file) events[eventIndex].imagePath = `/uploads/${req.file.filename}`;

    res.status(200).json({ success: true, data: events[eventIndex] });
});

// ADMIN DELETE: REMOVE EVENT
app.delete('/api/admin/events/:id', (req, res) => {
  const eventId = req.params.id;
  const eventIndex = events.findIndex((e) => e.id == eventId);
  
  if (eventIndex === -1) return res.status(404).json({ success: false, message: 'Event not found' });

  const event = events[eventIndex];
  if (event.imagePath) {
    const fullPath = path.join(__dirname, event.imagePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }

  events.splice(eventIndex, 1);
  registrations = registrations.filter((r) => r.eventId != eventId);
  res.status(200).json({ success: true, message: 'Event deleted successfully' });
});

// ADMIN GET: REGISTRATIONS
app.get('/api/admin/registrations', (req, res) => {
  const report = events.map(event => ({
    eventTitle: event.title,
    eventId: event.id,
    attendees: registrations.filter(r => r.eventId == event.id)
  }));
  res.status(200).json({ success: true, data: report });
});

// 404 CATCH-ALL
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Backend Active: http://localhost:${PORT}`);
});