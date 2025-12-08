#include <stdio.h>
#include <string.h>

#define MAX_LINE_LENGTH 1024
#define MAX_LINES 1000

// Counts words in a single line by detecting transitions from whitespace to non-whitespace
static int count_words(const char *line) {
    int count = 0;
    int in_word = 0;

    for (const char *p = line; *p != '\0'; ++p) {
        if (*p == ' ' || *p == '\t' || *p == '\n' || *p == '\r' || *p == '\f' || *p == '\v') {
            in_word = 0;
        } else if (!in_word) {
            in_word = 1;
            ++count;
        }
    }

    return count;
}

int main(int argc, char *argv[]) {
    // Ensure a filename argument is provided
    if (argc != 2) {
        fprintf(stderr, "Usage: %s <filename>\n", argv[0]);
        return 1;
    }

    const char *filename = argv[1];

    // Open the file for reading
    FILE *file = fopen(filename, "r");
    if (!file) {
        fprintf(stderr, "Error: unable to open file %s\n", filename);
        return 1;
    }

    char line[MAX_LINE_LENGTH];
    int line_number = 0;

    // Read each line up to the maximum allowed lines
    while (fgets(line, sizeof(line), file)) {
        ++line_number;

        // Stop processing if the line limit is reached to stay within safe bounds
        if (line_number > MAX_LINES) {
            fprintf(stderr, "Warning: maximum line limit (%d) reached; remaining lines skipped.\n", MAX_LINES);
            break;
        }

        // Count words in the current line
        int words = count_words(line);

        // Print the line number and its corresponding word count
        printf("Line %d: %d words\n", line_number, words);
    }

    // Close the file and report success
    fclose(file);
    return 0;
}
