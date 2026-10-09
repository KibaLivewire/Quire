# Quire 1.9.2 — The page stands upright

Released 9 October 2026.

- **A phone can write without being turned sideways.** The letter page fits the width of an upright screen and scrolls. It is no longer an 8.5 inch sheet clipped to the left edge.
- **Desktop is 1.9.2.** The Windows installer is `Quire-Setup-1.9.2.exe`.
- **The Play build is 1.0.1.** versionName `1.0.1`, versionCode `2`.

Windows installer: Quire-Setup-1.9.2.exe

Play bundle: versionName 1.0.1, versionCode 2

---

# Quire 1.9.1 — The same desk, looked at again

Released 9 October 2026.

- **An imported style still cannot cover the desk.** A comment or a CSS escape no longer brings back fixed, absolute, or sticky placement, or a viewport size. Colour, type, a relative picture offset, and a filter or turn stay. An add-on can still restyle the desk.
- **A picture edit stays a filter or a turn.** An escaped `url()` is dropped with the other remote picture addresses.
- **Word import keeps a tab and a line break inside a paragraph.** The words on either side are not glued together. Struck-out revisions and field codes stay out. An emoji is still kept.
- **An RTF picture no longer throws the reader off.** The bytes after `\bin` are skipped, including a brace. The writing after the picture stays.
- **A folder's size and last edit ignore Trash.** A page or a folder you already removed does not make the folder look larger or newer. Delete, restore, and empty trash are unchanged.
- **A written `<` is not counted as `<`.** The plain text of a page decodes `&` last, the same way export already did.
- **A backup sheet that is not text becomes a blank sheet.** It does not throw, and it does not move the sheets beside it.
- **The eight checks from 1.8.13 stay.** The passcode is still a screen gate. Backups stay plaintext.

Windows installer: build `Quire-Setup-1.9.1.exe` from this source. The copy on disk before this release is still `Quire-Setup-1.9.0.exe`.

Play bundle: unchanged, versionName `1.0`, versionCode `1`.

---

# Quire 1.9.0 — Ready to publish

Released 8 October 2026.

- **Desktop is 1.9.0.** The Windows installer is `Quire-Setup-1.9.0.exe`. It includes the 1.8.13 checks.
- **The Play build is 1.0.** versionName `1.0`, versionCode `1`. The phone shows 1.0. A later desktop number does not change the store listing.
- **Android sync no longer asks Windows for `npx`.** The page was already built. The sync now runs through Node, so `npm run build:android` can finish.
- **The eight checks from 1.8.13 stay.** A stale sheet cannot grow the notebook. Find agrees across a line break. A zip is read from its directory. Word import keeps an emoji. PDF Latin text asks for WinAnsi. An imported style cannot cover the desk. A link is one web address or one email. A passcode check walks the whole digest. The passcode is still a screen gate. Backups stay plaintext.

Windows installer: Quire-Setup-1.9.0.exe

Play bundle: versionName 1.0, versionCode 1

---

# Quire 1.8.13 — The same page, checked twice

Released 8 October 2026.

- **A stale sheet number no longer grows the notebook.** Saving only replaces a sheet that is still there, so a removed sheet cannot come back as a blank extra page.
- **Find agrees across a line break.** The open sheet keeps a break the same way the other sheets do, so the letters on either side are not one word. Overlapping matches are still counted. Replace All still steps through without eating the same letters twice.
- **A zip is read from its directory, not from the first lookalike header.** A `PK` signature inside a file no longer cuts the file short. The 40 MB cap counts decoded bytes, the 80-file cap stays, and a path that climbs out of the archive is still refused.
- **Word import keeps characters past the old 16-bit line.** An emoji stored as a numeric character stays. A null, a surrogate, or a code that is not a character is dropped. Ordinary paragraphs are unchanged.
- **PDF Latin text asks for WinAnsi.** Accented letters are no longer stored as WinAnsi bytes on a font left in Standard encoding. Letters outside that set are still drawn as a picture.
- **An imported style cannot cover the desk.** Fixed, absolute, and sticky placement, and viewport sizes, are dropped from page styles. Colour, type, a relative picture offset, and a filter or turn stay. An add-on can still restyle the desk.
- **A link is one web address or one email.** A second address after a line break is not opened, on the page or by the Windows shell. `javascript:` and `file:` stay refused.
- **A passcode check walks the whole digest.** The passcode is still a screen gate, not encryption. Pages and backups stay plaintext. Wrong guesses still wait, and the wait still grows.

Windows installer: Quire-Setup-1.8.13.exe

---

# Quire 1.8.12 — A phone can reach the desk

Released 8 October 2026.

- **The File menu is on the phone.** Open, backup, transfer, and trash are no longer desktop-only. Keyboard shortcuts stay off the phone menus.
- **Focus is on the page header** on a small screen, not only on a wide one.
- **The keyboard shortens the desk** instead of covering the last lines. Android resizes the window when the keyboard opens.
- **Toolbar buttons are large enough to tap.** Search fields use a text size that does not jump the page when focused.
- **Export and share write into the folder Android is allowed to hand out.** A shared file is no longer stored where the share sheet cannot see it.
- **The Play listing uses the real version.** This build is versionName 1.8.12, versionCode 10812. The broad photo-library permission is not requested. The camera is still offered when you insert a picture, and a phone without a camera can still install.
- **Writing, the passcode, and backups are unchanged.** The passcode is still a screen gate. Backups stay plaintext.

Windows installer: Quire-Setup-1.8.12.exe

---

# Quire 1.8.11 — The same answer everywhere

Released 7 October 2026.

- **Find counts the same hits on every sheet.** Overlapping matches, including a character past the old 16-bit line, are reported on the sheet you are on and on the ones you are not. Replace All still steps through without eating the same letters twice.
- **A sheet number that no longer exists is pulled back.** Opening a page, or removing a sheet, cannot leave Find and the save pointed past the last sheet, and a bad index cannot invent a run of blank sheets.
- **A Windows server that keeps answering with an error is started again,** the same as one that stops answering. Five bad answers, then a flush, then a restart.
- **Android Back waits until the notebook is written,** up to a few seconds, instead of leaving on a short timer.
- **Quill’s word lists give up after 8 seconds,** the same as grammar.
- **An opened zip cannot expand without a limit.** Inflation stops at the same 40 MB cap as the file itself.
- **Imported picture styles can only be a filter or a turn.** A saved page cannot use that style to cover the desk. Odd picture addresses (`file:`, `blob:`, and the like) are dropped.
- **PDF keeps letters it used to turn into a question mark,** by drawing that line. Latin text stays real text.
- **Word export keeps pictures** that already live on the page. The old Word HTML export is cleaned the same way as the web page export.
- **The passcode is still a screen gate, not encryption.** Pages and backups stay plaintext.

Windows installer: Quire-Setup-1.8.11.exe

---

# Quire 1.8.10 — The window opens

Released 7 October 2026.

- **The desk opens again.** The 1.8.9 window policy blocked the page's own startup script, so the installed app stayed blank. That script is allowed. Remote scripts still are not.

Windows installer: Quire-Setup-1.8.10.exe

---

# Quire 1.8.9 — Keep the last keystroke

Released 7 October 2026.

- **A stalled Windows server no longer reloads the desk under your hands.** Health checks ignore sleep and a single bad answer. Five misses are required before the local server is restarted, and the page is written first. A server that exits on its own does the same. Only an HTTP 200 counts as “up.” A busy port is named only when something is already listening.
- **Delete, duplicate, a new folder, and restore write the page on screen first.** The last half-second is not left in the debounce. A sheet split still cancels the page timer, not the title.
- **A failed desk read is not saved as a new Welcome.** Quire stays on the “could not be read” screen instead of writing a seed over the notebook already on this device.
- **The passcode is still a screen gate, not encryption.** Pages and backups stay plaintext. A wrong guess now waits, and the wait grows. The overlay says the file is not encrypted.
- **Imported HTML is tighter.** Scriptable SVG data URLs, `srcset`, form actions, `javascript:` image links, highlight colors, and `url()` / `expression()` in styles and add-on CSS are dropped. The Windows window has a content policy. Android no longer allows mixed content, and Android backup of the app data is off.
- **Paste from the Edit menu is text.** A copied `<img onerror>` is not parsed as markup.
- **Open keeps Word paragraphs and skips RTF font tables.** A `.txt` is text even if it mentions `<html`. A zip over 40 MB, or a path that climbs out of the archive, is refused. A backup with a null page is skipped. Restoring a desk does not roll a newer Desk revision back unless the backup is newer.
- **An empty table, rule, or checklist is not a blank sheet.** The second copy of “Name copy” is “Name copy 2.” Move to shows the folder path. New page and new folder wait if that folder is locked. Find reports overlapping matches. Hardware Back on Android can leave the app, and it writes first.
- **Grammar and Quill give up after 8 seconds** instead of waiting forever.
- **Pictures over 25 MB are refused. A GIF over 8 MB is refused** instead of frozen.
- **PDF can still turn letters outside Latin-1 into a question mark. Word export still leaves pictures out.** Those were left as they are.

Windows installer: Quire-Setup-1.8.9.exe

---

# Quire 1.8.8 — Safer opens

Released 25 September 2026.

- **Opening a link from the page only goes to a normal web address.** A click opens http or https. Other kinds of links are refused the same way the in-app open already was
- **Links you paste or autolink in the editor stay web or email** — not ftp, tel, and the like
- **If the local Windows server stops answering with an error, Quire counts that toward starting it again,** the same as a timeout
- **Windows builds: the test suite actually runs the script tests now.** A couple of symlink checks skip when Windows blocks symlinks
- **Lint no longer scans the packed release folder**
- **Small cleanups** in ambient sound and auth parsing

Windows installer: Quire-Setup-1.8.8.exe

---

# Quire 1.8.7 — The whole page

Released 24 September 2026.

- **A full sheet turns when the desk is scaled.** The cut now uses the same size you see, so a fitted window no longer scrolls inside the page, and zooming in does not turn too early
- **Export, print, and backup keep the last keystrokes.** File, the page menu, and Desk write the page that is on screen, not the one from half a second ago. Ctrl+S already did
- **Restore desk replaces the open page.** The page you were typing is not written back over the restored copy
- **Remove on a blank sheet checks again.** Words you just typed are not flushed and then deleted
- **Closing waits, and asks if the save did not finish.** A failed save, or one that is still going after a longer wait, offers to keep Quire open
- **GIFs stay in motion,** including ones larger than a small photo. A GIF over 8 MB is refused instead of frozen. A transparent WebP or PNG keeps its clear background
- **Find and Replace cover every sheet** of the page. What you type is text, so `<` and `&` are not turned into markup
- **Mute stops the level meter.** Ctrl+M and the speaker quiet the room and the meter. Turning the room sound off still does both
- **“I mean …” is not a definition.** Define, “what is,” and “look up” still are
- **A line break inside a paragraph** no longer shifts a grammar fix onto the wrong words
- **Word export keeps tables** as tables. Pictures are still left out
- **PDF keeps an empty sheet,** and a filter or rotation on a GIF shows on that page. Letters outside Latin-1 can still appear as a question mark
- **Definitions read as words.** Ampersands and quotes are not left as dictionary codes
- **Links must be a web address or an email.** A `javascript:` link is refused. An imported page does not fetch a remote image hidden in a style
- **If the Windows server stops answering after startup, Quire starts it again.** A crash before the first page is ready is tried once more. The passcode is still a screen gate. It does not encrypt the page

Windows installer: Quire-Setup-1.8.7.exe

---

# Quire 1.8.6 — The last line stays

Released 24 September 2026.

- **Leaving a sheet keeps the last keystrokes.** Adding a sheet, turning the page, or opening another page within the half-second save no longer drops what you just typed. A title change is kept the same way
- **Quill’s greeting no longer covers the desk.** It sits in the corner. Escape, a click on the page, or Close dismisses it. Never show again still keeps it away next time
- **A failed save says so.** The header stays on “Could not save” instead of “Saving” when the write does not land
- **Large GIFs are reduced** the way large photos already are, so a few animations cannot fill the desk. A small GIF is left as it is
- **Saves reuse one database connection** instead of opening a new one on every keystroke pause
- **A new desk’s Welcome** is dated the day you first open Quire, not 12 September 2026
- **Open needs a folder.** If the desk has none, Quire makes one and puts the file there. It does not say the file opened when the page was never created
- **Grammar sends the sentence you are in**, not the whole sheet. A fix that cannot find its place is not pasted at the cursor. Quill does not send a selection out unless you ask it to polish. A definition tries another dictionary if the first one is down
- **Suggestions are typed as text.** A grammar or Quill line that contains `<` or `&` is not treated as markup
- **RTF keeps emoji and other characters above the old 16-bit line**
- **PDF starts a new page for each sheet** and uses the page size from Desk. Letters outside the Latin-1 set can still appear as a question mark
- **Word lists keep their bullets.** Pictures are still left out of the Word file
- **If the Windows server stops after startup, Quire starts it again.** The message names a busy port only when the port is actually busy. Closing while the first page is still loading waits for the save. Desk settings are written to the side, then moved into place, so a crash mid-write does not leave a half file
- **Turning the room sound off stops the level meter** as well as the audio
- **The passcode is still a screen gate.** It does not encrypt the page. A locked page is still plain text on this device

Windows installer: Quire-Setup-1.8.6.exe

---

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
