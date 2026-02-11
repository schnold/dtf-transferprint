# Auth Pages - German Translations

All English messages on authentication pages have been translated to German.

## Translations Made

### 1. Login Page (`login.astro`)

| English | German |
|---------|--------|
| Email address | E-Mail-Adresse |
| Password | Passwort |
| Forgot your password? | Passwort vergessen? |
| Sign in | Anmelden |
| Don't have an account? | Noch kein Konto? |
| Sign up | Registrieren |
| Failed to sign in | Fehler beim Anmelden |

### 2. Signup Page (`signup.astro`)

| English | German |
|---------|--------|
| Full Name | Vollständiger Name |
| Email address | E-Mail-Adresse |
| Password | Passwort |
| Password (min. 12 characters) | Passwort (min. 12 Zeichen) |
| Must contain uppercase, lowercase, number, and special character | Muss Groß- und Kleinbuchstaben, Zahlen und Sonderzeichen enthalten |
| Confirm Password | Passwort bestätigen |
| Sign up | Registrieren |
| Already have an account? | Bereits ein Konto? |
| Sign in | Anmelden |
| Passwords do not match | Passwörter stimmen nicht überein |
| Password must be at least 12 characters and contain uppercase, lowercase, number, and special character | Passwort muss mindestens 12 Zeichen lang sein und Groß- und Kleinbuchstaben, Zahlen und Sonderzeichen enthalten |
| Failed to create account | Fehler beim Erstellen des Kontos |

### 3. Reset Password Page (`reset-password.astro`)

| English | German |
|---------|--------|
| Passwords do not match | Passwörter stimmen nicht überein |
| Password must be at least 12 characters and contain uppercase, lowercase, number, and special character | Passwort muss mindestens 12 Zeichen lang sein und Groß- und Kleinbuchstaben, Zahlen und Sonderzeichen enthalten |

## Files Modified

1. `src/pages/auth/login.astro`
   - Labels, placeholders, button text
   - Error messages

2. `src/pages/auth/signup.astro`
   - Labels, placeholders, button text
   - Helper text
   - Error messages

3. `src/pages/auth/reset-password.astro`
   - Error messages

## Key Translation Patterns

### Password Requirements
```
English: "Password must be at least 12 characters and contain uppercase, lowercase, number, and special character"

German: "Passwort muss mindestens 12 Zeichen lang sein und Groß- und Kleinbuchstaben, Zahlen und Sonderzeichen enthalten"
```

### Password Helper Text
```
English: "Must contain uppercase, lowercase, number, and special character"

German: "Muss Groß- und Kleinbuchstaben, Zahlen und Sonderzeichen enthalten"
```

### Form Fields
- **Email address** → **E-Mail-Adresse**
- **Password** → **Passwort**
- **Full Name** → **Vollständiger Name**
- **Confirm Password** → **Passwort bestätigen**

### Buttons & Links
- **Sign in** → **Anmelden**
- **Sign up** → **Registrieren**
- **Forgot your password?** → **Passwort vergessen?**

### Questions
- **Don't have an account?** → **Noch kein Konto?**
- **Already have an account?** → **Bereits ein Konto?**

### Error Messages
- **Invalid email or password** (Better Auth) → **Ungültige E-Mail-Adresse oder Passwort.**
- **Passwords do not match** → **Passwörter stimmen nicht überein**
- **Failed to sign in** → **Fehler beim Anmelden**
- **Failed to create account** → **Fehler beim Erstellen des Kontos**

## Testing

After these changes, test each page:

1. **Login** (`/auth/login`)
   - Check all field labels and placeholders are in German
   - Trigger validation errors to see German error messages

2. **Signup** (`/auth/signup`)
   - Check all field labels and placeholders are in German
   - Try mismatched passwords → should show German error
   - Try weak password → should show German error
   - Check helper text under password field

3. **Reset Password** (`/auth/reset-password?token=XXX`)
   - Try mismatched passwords → should show German error
   - Try weak password → should show German error

## Status

✅ All English messages translated to German  
✅ No linter errors  
✅ Consistent terminology across all pages  
✅ User-friendly German translations  
✅ Password requirements clearly explained  

## Notes

- All error messages maintain consistency with existing German translations
- Password requirements are clearly stated in German
- Form validation messages are user-friendly
- All placeholders and labels use proper German grammar
