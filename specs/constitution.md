# AstroClaus Constitution

AstroClaus (Astro Santa) lets anyone write a letter to Santa, post it, and share a link. These rules apply to every feature. A spec that conflicts with a rule must change the rule first, or change itself.

## A. How the code is built

1. **Readable code is non-negotiable.** A change that makes code harder to read needs a reason written in its spec.
   *Why: readability is the one quality this project does not trade away.*

2. **Vertical slices.** Code is grouped by feature under `Features/`. Each slice owns its page, form and endpoint. Slices never use each other's insides.
   *Why: a change to one feature should touch one folder.*

3. **Shared code lives at the lowest level that covers everyone who uses it:** the slice folder, then the feature folder, then `Features/Shared/`. No folders named after a kind of file, such as "Interfaces" or "Helpers".
   *Why: code is found next to what uses it, and a folder named after a file kind hides which feature needs what.*

4. **One type per file, named after the type.**
   *Why: a type is found by its file name.*

5. **No new layer, interface or type without a reason.** Add one only when the same pain shows up in two or more places, or when it blocks the next agreed requirement. Say what gets simpler and what gets harder.
   *Why: tidy-looking structure that spreads work across many files costs more than it saves.*

## B. Rules for code and data

6. **Every limit is defined once.** Lengths, counts and sizes are defined in one place, and messages and page text read them from there.
   *Why: a limit changed in one place must change everywhere, and no message may quote a stale number.*

7. **Storage is Azure Blob only, with no database.** A letter is written once and never changed or overwritten. Its main file is written last, so a letter only exists once all its images are stored.
   *Why: nothing needs querying or updating, so write-once blobs are enough.*

8. **No accounts and no personal information.** Anyone with the link can read a letter. The link is the only protection, so ids are random.
   *Why: the Terms page promises it.*

9. **Uploads are judged by their content,** never by their file name or what the browser says they are.
   *Why: a name or a declared type can lie; the file's own signature cannot.*

10. **No secrets in committed files.** Local development uses your own sign-in or user secrets. Production uses managed identity.
    *Why: a key in a committed file is exposed to everyone who can read the repo.*

## C. How we build

11. **Spec first.** Every feature gets a written spec. Its rules are listed and agreed before any code is written.
    *Why: a rule found halfway through the build is rework.*

12. **Every feature has unit tests,** written in the same change as the feature, in the `test/` folder, grouped by feature. A feature is not done until its tests pass.
    *Why: a feature that cannot be shown to work is not finished.*

13. **The build stays clean,** with 0 errors and 0 warnings, before a feature counts as done.
    *Why: warnings left in pile up and hide real problems.*

## Governance

Any change to a rule needs the project owner's agreement. Each change raises the version and updates the last-changed date.

**Version**: 1.0.0 | **Ratified**: 2026-10-10 | **Last changed**: 2026-10-10
