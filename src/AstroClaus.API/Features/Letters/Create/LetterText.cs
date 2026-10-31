using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace AstroClaus.API.Features.Letters.Create;

/// <summary>
/// Cleans what people type into a letter and spots text that shouldn't be in one. Output is always
/// HTML-encoded and letters are JSON files (no database), so this is about odd characters and
/// privacy, not injection.
/// </summary>
public static partial class LetterText
{
    private const int ZeroWidthJoiner = 0x200D;   // joins emoji such as 👨‍👩‍👧, so it stays
    private const int MaxMarksInARow = 3;

    /// <summary>One line (nickname, wish name): invisible characters and line breaks removed, spaces collapsed.</summary>
    public static string CleanLine(string? text) =>
        Spaces().Replace(RemoveInvisible(text, keepLineBreaks: false), " ").Trim();

    /// <summary>The message: invisible characters removed, spaces collapsed, at most 2 line breaks in a row.</summary>
    public static string CleanMessage(string? text)
    {
        var lines = RemoveInvisible(text, keepLineBreaks: true)
            .Split('\n')
            .Select(line => SpacesInALine().Replace(line, " ").Trim());
        return ThreeOrMoreLineBreaks().Replace(string.Join('\n', lines), "\n\n").Trim();
    }

    /// <summary>"Glitch text": several accent marks stacked on one letter, spilling over other lines.</summary>
    public static bool HasStackedMarks(string text)
    {
        var inARow = 0;
        foreach (var rune in text.EnumerateRunes())
        {
            inARow = IsMark(rune) ? inARow + 1 : 0;
            if (inARow > MaxMarksInARow) return true;
        }
        return false;
    }

    /// <summary>An email address or a phone number (9 to 15 digits, spaces and dashes allowed between).</summary>
    public static bool HasContactDetails(string text) => Email().IsMatch(text) || Phone().IsMatch(text);

    private static string RemoveInvisible(string? text, bool keepLineBreaks)
    {
        if (string.IsNullOrEmpty(text)) return "";

        var kept = new StringBuilder(text.Length);
        foreach (var rune in text.Replace("\r\n", "\n").EnumerateRunes())
        {
            if (IsLineBreak(rune)) { kept.Append(keepLineBreaks ? '\n' : ' '); continue; }
            if (rune.Value == '\t') { kept.Append(' '); continue; }
            if (IsInvisible(rune)) continue;
            kept.Append(rune.ToString());
        }
        // EnumerateRunes turned any broken character into U+FFFD first, so this can't throw.
        // A joiner with nothing to join (at an edge or next to a space) is invisible too.
        return StrayJoiners().Replace(kept.ToString().Normalize(NormalizationForm.FormC), "");
    }

    private static bool IsLineBreak(Rune rune) =>
        rune.Value is '\n' or '\r' or 0x0B or 0x0C or 0x85 or 0x2028 or 0x2029;

    // Control characters (null bytes...), format characters (zero-width spaces, the right-to-left
    // override that makes text display backwards...), private-use and broken characters.
    private static bool IsInvisible(Rune rune) =>
        rune.Value != ZeroWidthJoiner && Rune.GetUnicodeCategory(rune) is
            UnicodeCategory.Control or UnicodeCategory.Format or UnicodeCategory.PrivateUse or UnicodeCategory.Surrogate
        || rune == Rune.ReplacementChar;

    // Variation selectors pick how an emoji looks (❤️), so they don't count as stacked marks.
    private static bool IsMark(Rune rune) =>
        rune.Value is not (>= 0xFE00 and <= 0xFE0F) and not (>= 0xE0100 and <= 0xE01EF)
        && Rune.GetUnicodeCategory(rune) is UnicodeCategory.NonSpacingMark or UnicodeCategory.EnclosingMark or UnicodeCategory.SpacingCombiningMark;

    [GeneratedRegex(@"(?<=^|\s)‍+|‍+(?=\s|$)")] private static partial Regex StrayJoiners();
    [GeneratedRegex(@"\s+")] private static partial Regex Spaces();
    [GeneratedRegex(@"[^\S\n]+")] private static partial Regex SpacesInALine();
    [GeneratedRegex(@"\n{3,}")] private static partial Regex ThreeOrMoreLineBreaks();
    [GeneratedRegex(@"[\w.+-]+@[\w-]+(\.[\w-]+)+")] private static partial Regex Email();
    [GeneratedRegex(@"(?<![\w+])\+?(?:\d[\s().-]{0,2}){8,14}\d(?!\w)")] private static partial Regex Phone();
}
