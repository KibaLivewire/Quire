# Quire 1.8.5 — The next sheet

Released 23 September 2026.

- **A full sheet turns the page.** A long paragraph now continues on the next sheet. A picture taller than the page stays where it is, instead of trapping the rest of the writing
- **A split stays split.** The page that overflowed is not pasted back onto sheet 1, so the same words are not written twice
- **Quitting waits for the save.** If a save is already running, Quire waits for it and tries once more if the write fails. The window is not told the save finished until the notebook is actually stored. The header says “Saved on this device” only after that write, and stays on “Saving” if it does not
- **Word files open as words.** Ampersands and quotes are no longer left as `&` and `"`. A Word file that stores its size at the end of each part is read through, including the document
- **An older Desk file** cannot replace a newer theme, dictionary, or word aim when both copies are already on this computer
- **Startup does not wait forever.** If the local server never answers, or port 4173 is already taken, Quire stops and says so
- **PDF** places pictures where they sat in the writing, and sizes them to the page instead of shrinking them twice. Letters outside the normal Latin set can still appear as a question mark
- **A personal theme** is the desk you see when Quire opens, not a flash of Dark first
- **Export** separates sheets with a new line, from the File menu and the page menu, so the last word of one sheet does not stick to the first word of the next
- **Remove from the spelling book** no longer claims success when Windows cannot drop the word yet. The passcode is still a screen gate: it hides a page on this device, and it does not encrypt the notebook or a backup

Windows installer: Quire-Setup-1.8.5.exe

---

# Quire 1.8.4 — Keep the ink

Released 23 September 2026.

- **Closing the window keeps the last keystrokes.** A save that was still waiting is written before Quire quits. Closing again while that write is running waits, instead of throwing the window away
- **Ctrl+S saves the page** on this device. It no longer exports a Word file. Export stays in the File menu. Cancelling a save dialog is not an error
- **Replace All stops.** Replacing “cat” with “catalog” no longer runs forever
- **Sheets keep their recipe and ribbons** when a page overflows or a blank sheet is removed
- **Trash restore is more careful.** Restoring a folder does not bring back pages you trashed on their own, and it does not restart the 30 days for things already in Trash
- **Welcome is left alone.** Upgrading no longer replaces writing on “Welcome to Quire”
- **The daily word count** starts over when you change sheets, so a long sheet is not counted twice
- **Find** can see a word that is half bold or half highlighted
- **Grammar fixes** land on the right words after the first paragraph
- **A locked page** must be unlocked before Delete or Move, same as export and print. The passcode is still a screen gate, not a lock on the file
- **Your dictionary** is loaded again when Quire opens on Windows, and Quill’s polish skips those words. Removing a word takes it out of the spelling book
- **An older Desk file** cannot roll back a newer theme, dictionary, or word aim
- **One Quire window.** A second launch focuses the window you already have, instead of two copies writing one desk
- **Print** opens on the sheet you are writing and prints that sheet unless you turn off “This sheet only”
- **Open** keeps characters from Word and RTF instead of showing the raw codes or doubling them
- **Word export** no longer prints the same paragraph twice, and it keeps bold and italic
- **PDF** no longer swaps later pictures for earlier ones, and letters outside plain English no longer break the file
- **Quill** no longer treats “meant” as “define” or “prefix” as “fix”. Polish and definitions say when a sentence leaves the device. The notebook itself does not

Windows installer: Quire-Setup-1.8.4.exe

---

# Quire 1.8.3 — Trash from Desk


Released 22 September 2026.

- **Desk → Trash** — the Trash button in Desk settings opens the same list as File → Trash, including archived pages and folders

Windows installer: Quire-Setup-1.8.3.exe

---

# Quire 1.8.2 — The room stays quiet


Released 22 September 2026.

- **Mute stays muted** — creating a folder or a page, or renaming either one, no longer turns the room sound back on if you had muted it. Mute (or Ctrl+M) still toggles it. Dragging the volume slider still brings it back.

Windows installer: Quire-Setup-1.8.2.exe

---

# Quire 1.8.1 — Bookmarks, notes, and a page menu

Released 18 September 2026.

- **Color bookmarks** — select a letter, word, or passage and mark it Wine, Moss, Gilt, Sky, or Umber. The toolbar lists them so you can jump back
- **Notes** — add a note to a selection. A number in brackets sits beside it; hover the number to read the note. The Notes tab in the toolbar holds every note on the sheet
- **Right-click menu** — cut, copy, paste, select all, look up a word, narrate, add to dictionary, highlight, bookmark, add a note, and Quill (Shorter, Clearer, Fleshed out, Polish, Better word)

Windows installer: Quire-Setup-1.8.1.exe

---

# Quire 1.8.0 — Desk extras

Released 16 September 2026.

Writing tools that stay on this device.

- **Ink-saver print** — optional black type on white paper, and grayscale pictures, in print preview
- **Headers and page numbers** on printed sheets
- **PDF keeps pictures** — File → Export as PDF embeds the images on the page
- **Tables** — insert a 3×3 table from the toolbar; add or remove rows and columns
- **Transfer to another device** — save a zip on this computer, restore it on the phone or PC. Nothing goes through the internet
- **Journal date** — a new Journal page starts with today's date
- **Lock** — a passcode on a page or a folder. The passcode never leaves this device, and Quire cannot recover it
- **Two-page spread** — the next sheet sits beside the one you are writing
- **Add to dictionary** — selected words stay on this device and skip grammar marks
- **Quill** — can flesh out a short line in your voice; Shorter, Clearer, Fleshed out, Polish, Better word
- **Quill's face** — a white quill on black, with googly eyes
- **Rain** — blue-grey paper over a black desk; opening storm with rain, splashes, and distant thunder

Windows installer: Quire-Setup-1.8.0.exe

---

# Quire 1.7.0 — Android

Released 16 September 2026.

Quire is now a phone app as well as a Windows notebook.

- Android app via Capacitor (same desk, pages still on this device)
- Camera and gallery when you insert a picture
- Export and backup use the Android share sheet
- Phone layout: folders and pages first, letter sheet second, rulers tucked away
- System back key leaves a page, then the app

See ANDROID.md. Windows installer: Quire-Setup-1.7.0.exe

---

# Quire 1.6.3

Released 13 September 2026.

A cozy trust fix: your desk remembers how you left it.

- **Theme & Desk settings** survive a full quit and reopen (Navy, Dark, Light, Leather, ambient, opening scenes, and the rest)
- **Opening ritual** follows the theme you saved — not a Dark flash-default
- Pages and notebooks still live in the same local desk store

---

# Quire 1.6.2 — Cozy openings

Released 13 September 2026.

Each built-in theme now opens with its own quiet scene and room sound, then fades onto the desk.

- **Navy** — a wave wash; ocean and distant birds
- **Dark** — a moon and a paper owl; night insects and a soft hoot
- **Light** — plate, bagel, and coffee handed to the desk; café room tone
- **Leather** — the familiar falling leaves and wind chimes
- Esc skips the opening; reduced motion shows a still card
- Room sound follows the theme and crossfades when you change it

---

# Quire 1.6.1

Released 13 September 2026.

A small trust fix for the Desk ritual release.

- **About / shelf version** — Quire now shows the real app version (1.6.x) instead of a stuck 1.5.1 label

Installer: Quire-Setup-1.6.1.exe

---

# Quire 1.6.0 — Desk ritual

Released 13 September 2026.

A quieter writing posture for the desk you already know.

- **Page recipes** — New page asks what you are writing (Letter, Journal, Poem, List, Freewrite). Change recipe later; your words stay.
- **Ink only** — Just paper and typing. Hides borders, rulers, and picture chrome. Stacks with Focus; Esc still leaves Focus only.
- **Page map** — Jump to Heading 1–3 on this sheet (“On this page”).
- **Ribbon bookmarks** — Place a ribbon at the caret, jump back, or untie it.
- **Read back** — Local text-to-speech from caret or selection. Voice and pace live in Desk settings.

No cloud writing, no collab chrome. Quill stays a local helper.

Installer: Quire-Setup-1.6.0.exe

---

# Quire 1.5.1

Released 13 September 2026.

A calm follow-up to the Cozy Update.

- Chime dial sits in the bottom bar, centered between word count and zoom
- Desk → Wind chimes off hides the dial as well as the sound
- The falling-leaf opening fades into the desk instead of cutting
- Quill greets from a center popup: Close, or Never show again
- Quill’s chat stays closed until you open the feather in the toolbar
- Starter desk keeps only Welcome to Quire; sample pages are gone

Installer: Quire-Setup-1.5.1.exe

---

# Quire 1.5.0 — Cozy Update

Released 13 September 2026.

A quieter desk you can trust. Pages still live only on this computer.

- Opens on the last folder, page, sheet, cursor, and zoom
- Deleted pages and folders wait in Trash for 30 days
- File → Backup desk / Restore desk (local zip)
- Ctrl+F find, Ctrl+H replace
- Gentler Focus, typewriter scroll, daily word aim
- Soft looping wind chimes with a corner volume dial and Ctrl+M mute
- Falling leaves on launch, timed with the chimes
- Quill, a writing aide in the toolbar
- Welcome page rewritten as a field guide

Installer: Quire-Setup-1.5.0.exe

---

# Quire 1.4.0

Released 13 September 2026.

## Print
- File → Print preview (Ctrl+P) shows the page as a letter sheet before it hits the printer
- Walk pages with arrows, switch Portrait or Landscape for this print job
- Print sends only the page, not the whole Quire window
- Esc closes the preview

---

# Quire 1.3.0

Released 12 September 2026.

## Folders
- Folders can stack inside other folders, as deep as you want
- A folder can hold more folders and pages
- New folder, New folder inside, Move into, and Delete (including nested contents)
- The left shelf is a tree you can expand and collapse

## Color coding
- Color any folder from its ⋯ menu (swatches or a custom picker)
- Color any page from the small circle on the page list

## Search and filters
- Search bar looks through folder names and page text
- Filter by date created, last updated, and file size (small / medium / large)
- Sort by last updated, date created, file size, or name

## Pictures
- Word-style layout: Inline with text, Wrap text, Break text, Behind text, In front of text
- Text margin slider around pictures
- GIFs stay moving when you edit them (crop is skipped so frames are not frozen)
- Watermark is real overlay text, not just a faded picture
- Hover a picture to show corner handles and drag to resize
- Click a picture to select it and show Picture tools
- Drag the picture (not a corner) to move it on the page
- Pictures no longer sit behind a divider line from the writing

## Fixes
- New blank pages stay a full 8.5 × 11 in letter instead of shrinking
- Behind / In front of text pictures stay in that layer while you drag them
- File size in search is counted once, not twice

---

# Quire 1.2.0

- Real letter page (8.5 × 11 in portrait, landscape from Page)
- Inch rulers with cursor readout, on by default
- File / Edit / View / Help menus
- Open and export .DOCX, .DOC, .PDF, .TXT, .RTF
- Look up word: pronunciation, type, definition, example, synonyms, antonyms
