# Discord Bot Project

## Overview

This is a comprehensive Discord moderation and utility bot built with Node.js and Discord.js v14. The bot provides extensive server management capabilities including user moderation, leveling system, entertainment features, and administrative tools. It features a SQLite database for persistent data storage and supports both Turkish and English command interfaces.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Framework
- **Discord.js v14**: Primary framework for Discord API interaction with comprehensive gateway intents including guilds, messages, members, voice states, reactions, and direct messages
- **Node.js**: Runtime environment with ES6+ features and async/await patterns
- **Better-SQLite3**: Synchronous SQLite database for reliable data persistence

### Database Design
- **SQLite Schema**: Simple relational structure with two main tables:
  - `users`: Stores user progression data (XP, levels, coins, reputation, warnings, AFK status, daily rewards)
  - `warnings`: Tracks moderation history with foreign key relationships to users and moderators
- **Data Persistence**: All user progress, moderation actions, and bot state maintained across restarts

### Command Architecture
- **Prefix-based Commands**: Traditional `!` prefix system for all bot interactions
- **Modular Command Structure**: Commands organized by category (admin, utility, entertainment, leveling)
- **Permission System**: Role-based access control using Discord's built-in permission flags
- **Error Handling**: Comprehensive try-catch blocks with user-friendly error messages

### Bot Features Categories

#### Moderation System
- User management (ban, kick, mute, warnings)
- Channel management (lock, slowmode, message clearing)
- Role management (add/remove roles, temporary roles)
- Automated logging and audit trails

#### Leveling & Economy
- XP-based progression system with coins and reputation
- Daily/weekly/monthly reward systems
- Leaderboards for various metrics
- AFK status management

#### Utility Functions
- Server information commands
- User profile and statistics
- Weather, translation, and web search integration
- Reminder and scheduling system

#### Entertainment
- Games (TicTacToe, Rock-Paper-Scissors, Trivia, Hangman)
- Random content (memes, jokes, GIFs)
- Polls and voting systems

#### Logging System
- Comprehensive action logging for moderation activities
- Message edit/delete tracking
- Join/leave monitoring
- Voice channel activity logging

### Configuration Management
- Environment variable support for sensitive data (Discord token)
- Replit Secrets integration for secure token storage
- Runtime configuration through database settings

## External Dependencies

### Discord Integration
- **Discord.js v14**: Core library for Discord API communication
- **@discordjs/builders**: Command and embed construction utilities
- **@discordjs/rest**: HTTP client for Discord REST API interactions
- **discord-api-types**: TypeScript definitions for Discord API structures

### Database & Storage
- **better-sqlite3**: Primary database engine for data persistence
- **sqlite3**: Additional SQLite bindings for compatibility

### Utility Libraries
- **axios**: HTTP client for external API requests (weather, translation, crypto prices)
- **moment**: Date/time manipulation and formatting
- **node-cron**: Task scheduling for automated bot functions

### External APIs (Planned Integration)
- Weather services for location-based forecasts
- Translation services for multi-language support
- Cryptocurrency price APIs
- Social media APIs (YouTube, Steam, anime databases)
- Search engines for content discovery

### Authentication & Security
- Discord OAuth2 token-based authentication
- Environment variable configuration for secure token management
- Permission-based command access control
- Rate limiting through Discord.js built-in handling