# Flashcards by Ignyos

A modern, intelligent flashcard application that uses spaced repetition and adaptive learning algorithms to optimize your study sessions. Built with vanilla JavaScript and designed for efficient, personalized learning.

## ✨ Features

### 🧠 Smart Learning System
- **Adaptive Spaced Repetition**: Automatically adjusts review intervals based on your performance
- **Mastery Tracking**: Cards graduate to "mastered" status when consistently answered correctly
- **Performance Analytics**: Detailed statistics track your learning progress over time
- **Customizable Learning Parameters**: Adjust mastery requirements, review cycles, and difficulty settings

### 📚 Flexible Study Options
- **Regular Quizzes**: AI-powered quiz generation focusing on cards that need the most practice
- **Custom Quiz Builder**: Create targeted study sessions with specific decks and cards
- **Deck Management**: Organize your flashcards into themed collections
- **Multi-Student Support**: Separate profiles for different learners

### 📊 Comprehensive Analytics
- **Performance Dashboard**: Visual insights into your learning progress
- **Success Rate Tracking**: Monitor accuracy trends across all your decks
- **Mastery Progress**: See which cards you've conquered and which need work
- **Study Session History**: Complete record of your learning journey

### ⚙️ Advanced Settings
- **Granular Data Management**: Clear history or reset mastery for specific decks or all content
- **Customizable Study Parameters**: Fine-tune the learning algorithm to match your preferences
- **Export/Import Capabilities**: Backup your progress and transfer data between devices
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🚀 Getting Started

Simply visit [flashcards.ignyos.com](https://flashcards.ignyos.com) to start using the application immediately - no installation required!

### Prerequisites
- Modern web browser with JavaScript enabled
- Works on desktop and mobile devices

## 📖 How to Use

### 1. Create Your First Student Profile
- Click "Get Started" from the home page or "New Student" from the main menu
- Enter your name to create a personalized learning profile

### 2. Add Flashcard Decks
- Navigate to the Flashcards section
- Create decks organized by subject, topic, or difficulty level
- Add cards with questions and answers

### 3. Start Learning
- Use "Quiz Me!" for AI-optimized study sessions
- Try the Custom Quiz Builder for targeted practice
- Review your progress in the Stats section

### 4. Optimize Your Learning
- Adjust settings in the Settings page to match your learning style
- Use the data management tools to reset progress when needed
- Export your data for backup or transfer

## 🏗️ Technical Architecture

### Frontend
- **Pure JavaScript**: No frameworks - lightweight and fast
- **CSS Grid & Flexbox**: Modern, responsive layout system
- **IndexedDB**: Client-side storage for offline functionality
- **Modular Design**: Clean separation of concerns across page modules

### Data Storage
- **Local Storage**: All data stored in your browser
- **No Server Required**: Complete privacy - your data never leaves your device
- **Export/Import**: JSON-based backup system for data portability

### Key Components
- `app.js` - Core application routing and management
- `indexedDb.js` - Database operations and data persistence
- `state.js` - Application state management
- `dataModels.js` - Data structure definitions
- Page modules in `/pages` - Individual feature implementations

## 🔧 Configuration

### Learning Algorithm Settings
- **Mastery Streak Count**: Number of consecutive correct answers required for mastery
- **Review Cycle Days**: How often to review mastered content
- **Mastery Window Days**: Time period for calculating mastery eligibility

### Data Management Options
- **Clear Quiz History**: Remove performance data while preserving mastery status
- **Reset Mastery Progress**: Clear mastery designations and related learning history
- **Complete Reset**: Fresh start with all learning data cleared
- **Selective Operations**: Target specific decks for granular control

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Report Issues**: Found a bug? Open an issue with detailed reproduction steps
2. **Suggest Features**: Have ideas for improvements? Share them in the issues section
3. **Submit Pull Requests**: Ready to code? Fork the repo and submit your changes
4. **Improve Documentation**: Help make the README and code comments clearer

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with descriptive messages: `git commit -m 'Add amazing feature'`
5. Push to your branch: `git push origin feature/amazing-feature`
6. Open a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by spaced repetition research and modern learning science
- Built with modern web standards for maximum compatibility
- Designed for learners who value privacy and offline capability

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Ignyos/Flashcards/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Ignyos/Flashcards/discussions)

---

**Happy Learning!** 🎓
