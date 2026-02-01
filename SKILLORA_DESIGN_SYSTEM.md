# Skillora Design System & Brand Guidelines

## 🎨 Brand Color Palette

### Primary Colors
- **Primary Blue**: `#2563eb` - Main brand color for buttons, links, and key elements
- **Primary Dark**: `#1d4ed8` - Darker variant for hover states and emphasis
- **Primary Light**: `#3b82f6` - Lighter variant for backgrounds and subtle elements
- **Primary 50**: `#eff6ff` - Very light blue for backgrounds and highlights
- **Primary 100**: `#dbeafe` - Light blue tint for cards and sections

### Secondary Colors
- **Secondary Purple**: `#7c3aed` - Secondary brand color for accents and variety
- **Secondary Dark**: `#6d28d9` - Darker purple for hover states
- **Secondary Light**: `#8b5cf6` - Lighter purple for backgrounds

### Accent Colors
- **Accent Cyan**: `#06b6d4` - For highlights, notifications, and special elements
- **Accent Dark**: `#0891b2` - Darker cyan variant
- **Accent Light**: `#22d3ee` - Lighter cyan variant

### Status Colors
- **Success Green**: `#10b981` - For success messages, completed states
- **Warning Amber**: `#f59e0b` - For warnings and caution states
- **Error Red**: `#ef4444` - For errors and destructive actions
- **Info Blue**: `#3b82f6` - For informational messages

### Neutral Colors
- **Gray Scale**: From `#f9fafb` (lightest) to `#111827` (darkest)
- **Text Primary**: `#1e293b` - Main text color
- **Text Secondary**: `#475569` - Secondary text color
- **Text Tertiary**: `#64748b` - Tertiary text color

## 🎯 Brand Identity

### Logo & Typography
- **Font Family**: Inter (primary), system fonts (fallback)
- **Brand Name**: Skillora
- **Tagline**: "Empowering learners worldwide"

### Visual Elements
- **Border Radius**: Rounded corners (4px to 16px scale)
- **Shadows**: Subtle elevation with multiple shadow levels
- **Gradients**: Linear gradients from primary to secondary colors
- **Icons**: Consistent stroke width and style

## 🏗️ Component System

### Buttons
```css
/* Primary Button */
.skillora-btn-primary {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 500;
}

/* Secondary Button */
.skillora-btn-secondary {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  color: white;
}

/* Outline Button */
.skillora-btn-outline {
  background: transparent;
  border: 1px solid #2563eb;
  color: #2563eb;
}
```

### Cards
```css
.skillora-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.25s ease;
}

.skillora-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}
```

### Forms
```css
.skillora-form-input {
  padding: 12px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.15s ease;
}

.skillora-form-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
```

## 📱 Responsive Design

### Breakpoints
- **Mobile**: `max-width: 768px`
- **Tablet**: `769px - 1024px`
- **Desktop**: `1025px+`

### Grid System
- **Container**: Max-width 1280px with responsive padding
- **Grid**: CSS Grid with 12-column system
- **Spacing**: 8px base unit scale (4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px)

## ♿ Accessibility Features

### Color Contrast
- **AA Compliance**: All text meets WCAG 2.1 AA standards
- **AAA Where Possible**: Important content meets AAA standards
- **High Contrast Mode**: Enhanced contrast for accessibility needs

### Focus Management
- **Visible Focus**: Clear focus indicators on all interactive elements
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Proper ARIA labels and semantic HTML

### Motion & Animation
- **Reduced Motion**: Respects user's motion preferences
- **Smooth Transitions**: 150ms-350ms timing for interactions
- **Meaningful Animation**: Animations enhance UX, not distract

## 🌙 Dark Mode Support

### Dark Mode Colors
- **Background Primary**: `#0f172a`
- **Background Secondary**: `#1e293b`
- **Text Primary**: `#f1f5f9`
- **Text Secondary**: `#cbd5e1`
- **Border Colors**: Adjusted for dark backgrounds

### Implementation
```css
@media (prefers-color-scheme: dark) {
  :root {
    --skillora-bg-primary: #0f172a;
    --skillora-text-primary: #f1f5f9;
    /* ... other dark mode variables */
  }
}
```

## 🎨 Usage Guidelines

### Do's
✅ Use the primary blue for main actions and navigation
✅ Apply consistent spacing using the 8px scale
✅ Maintain proper color contrast ratios
✅ Use gradients for buttons and hero sections
✅ Keep rounded corners consistent (12px for most elements)
✅ Apply hover states with subtle transforms and shadows

### Don'ts
❌ Don't use colors outside the defined palette
❌ Don't mix different border radius values randomly
❌ Don't ignore accessibility guidelines
❌ Don't use too many colors in a single interface
❌ Don't forget to test in dark mode
❌ Don't use animations that could cause motion sickness

## 🚀 Implementation

### CSS Custom Properties
All colors and spacing are defined as CSS custom properties (variables) for easy maintenance and theming:

```css
:root {
  --skillora-primary: #2563eb;
  --skillora-secondary: #7c3aed;
  --skillora-space-4: 1rem;
  --skillora-radius-lg: 0.75rem;
  /* ... more variables */
}
```

### Component Classes
Use the `skillora-` prefix for all component classes to avoid conflicts:

```html
<button class="skillora-btn skillora-btn-primary">
  Get Started
</button>

<div class="skillora-card">
  <div class="skillora-card-body">
    Content here
  </div>
</div>
```

## 📊 Brand Applications

### Learning Platform UI
- **Course Cards**: White background with subtle shadows and hover effects
- **Progress Bars**: Primary blue with smooth animations
- **Navigation**: Clean, minimal design with clear hierarchy
- **Forms**: Rounded inputs with focus states and validation

### Marketing Materials
- **Hero Sections**: Gradient backgrounds with primary colors
- **Call-to-Action**: Bold primary buttons with hover effects
- **Testimonials**: Cards with subtle borders and spacing
- **Features**: Icons with accent colors for visual interest

## 🔧 Development Tools

### CSS Framework
The design system is built with:
- CSS Custom Properties for theming
- Flexbox and CSS Grid for layouts
- Media queries for responsive design
- Pseudo-classes for interactive states

### Component Library
All components are available as:
- Reusable CSS classes
- React components (when applicable)
- Design tokens for consistency
- Documentation with examples

This design system ensures a consistent, professional, and accessible user experience across the entire Skillora platform while maintaining brand identity and usability standards.