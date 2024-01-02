const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Database setup
mongoose.connect('mongodb://localhost:27017/citchat', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  name: String,
  loginTime: Date,
});

const User = mongoose.model('User', userSchema);

const messageSchema = new mongoose.Schema({
  time: Date,
  user: String,
  message: String,
});

const Message = mongoose.model('Message', messageSchema);

// Express setup
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle new user login
  socket.on('login', async (userData) => {
    try {
      console.log('Received login request for userData:', userData);

      if (!userData || typeof userData.userName === 'undefined' || typeof userData.userName !== 'string' || userData.userName.trim() === '') {
        console.error('Invalid userName:', userData);
        io.emit('loginError', { error: 'Invalid userName' });
        return;
      }

      const user = new User({ name: userData.userName, loginTime: new Date() });
      await user.save();

      console.log('User saved successfully:', user);

      const users = await User.find({});
      console.log('Fetched active users:', users);
      io.emit('activeUsers', users);
    } catch (error) {
      console.error('Error during login:', error);
      io.emit('loginError', { error: error.message });
    }
  });

//   // Handle incoming messages
//   socket.on('chatMessage', (data) => {
//     const { user: userName, message } = data;
//     const chatMessage = new Message({ time: new Date(), user: userName, message });

//     chatMessage.save()
//       .catch((err) => {
//         console.error(err);
//       });
//   });

// Handle incoming messages
socket.on('chatMessage', async (data) => {
    const { user: userName, message } = data;
  
    if (message === '!time') {
      // Jika pesan khusus adalah "!time", kirim waktu server
      const serverTimeWIB = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Jakarta' });
      socket.emit('serverTime', { time: serverTimeWIB });
    } else {
      // Jika bukan pesan khusus, simpan pesan ke database
      const chatMessage = new Message({ time: new Date(), user: userName, message });
      
      try {
        await chatMessage.save();
        // Broadcast the message to all clients
        io.emit('chatMessage', chatMessage);
      } catch (err) {
        console.error(err);
      }
    }
});


  // Handle user disconnect
  socket.on('disconnect', () => {
    console.log('A user disconnected');

    // Emit updated active users to all clients
    User.find({})
      .then((users) => {
        io.emit('activeUsers', users);
      })
      .catch((err) => {
        console.error(err);
      });
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
