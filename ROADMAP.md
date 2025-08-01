# Edinburgh Antiques Trail - Future Features Roadmap

This document outlines planned features and enhancements for future development of the Edinburgh Antiques Trail application.

## Upcoming Features

### Specialty-Based Messaging System
A bidirectional messaging system connecting users and dealers based on specialty interests:

#### User-to-Dealers (Request Broadcasting)
- Allow users to create item requests that are sent to all dealers with matching specialties
- Example: A map collector can request "18th century maps of Scotland" from all places with "Maps" as a specialty
- Include options for users to specify price range, condition requirements, and urgency
- Dealers receive notifications of relevant requests and can respond individually

#### Dealer-to-Users (Targeted Announcements)
- Enable dealers to broadcast announcements about new items or special offers to users who follow specific specialties
- Example: A bookshop could notify all users interested in "Rare Books" about a new acquisition
- Include filtering options to prevent message fatigue
- Users can opt in/out of specific categories of announcements

#### Implementation Considerations
- Will require user accounts/profiles with specialty preferences
- Privacy considerations for user contact information
- Notification delivery system (in-app, email, push notifications)
- Message templates and formatting guidelines
- Abuse prevention measures

## Potential Future Enhancements

### Enhanced Map Features
- In-app directions between multiple antique shops (would require Google Directions API)
- Optimized antiques trail routes based on user preferences
- Walking tours with audio guides

### Mobile Experience
- Native mobile app versions for iOS and Android
- Offline functionality for maps and place details

### Dealer Management Tools
- Enhanced analytics for dealers to track visitor engagement
- Inventory management integration
- Special event promotion

## Technical Roadmap

### API and Infrastructure
- Implement user authentication system
- Message storage and delivery infrastructure
- Push notification capabilities

### UI/UX Improvements
- Message composition interface
- Notification center
- User preference management for communication

### Development Priorities
1. Specialty filtering and search improvements (COMPLETED)
2. Google Maps API security hardening (COMPLETED)
3. User accounts and profiles (PLANNED)
4. Messaging system foundation (PLANNED)
