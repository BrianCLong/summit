const fs = require('fs');
const glob = require('glob');
const path = require('path');

function removeConflictMarkers(content) {
    // 1. Remove all blocks starting with <<<<<<< HEAD, keeping only what's between ======= and >>>>>>> origin/main

    let regex = /<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> origin\/main/g;

    // Apply multiple times because of nested conflict markers which may happen
    let newContent = content;
    let prevContent;
    let iterations = 0;
    do {
      prevContent = newContent;
      newContent = prevContent.replace(regex, '$2');
      iterations++;
    } while (newContent !== prevContent && iterations < 10);

    // Also replace those with only <<<<<<< HEAD ... ======= ...
    regex = /<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)/g;
    newContent = newContent.replace(regex, '$1');

    // Clean up any remaining isolated markers if any
    newContent = newContent.replace(/<<<<<<< HEAD\n/g, '');
    newContent = newContent.replace(/=======\n/g, '');
    newContent = newContent.replace(/>>>>>>> origin\/main\n/g, '');

    return newContent;
}

const options = {
    ignore: ['**/node_modules/**', '**/dist/**']
};

glob('**/package.json', options, function(err, files) {
    if (err) {
        console.error('Error finding files:', err);
        return;
    }

    files.forEach(function(file) {
        try {
            let content = fs.readFileSync(file, 'utf8');
            if (content.includes('<<<<<<< HEAD')) {
                console.log(`Fixing conflict markers in ${file}`);
                const fixedContent = removeConflictMarkers(content);

                // If it parses as JSON after our dumb fix, good, but it might need unquoted keys fixed
                let validJson = false;
                try {
                  JSON.parse(fixedContent);
                  validJson = true;
                } catch(e) {}

                if(validJson) {
                    fs.writeFileSync(file, fixedContent);
                    console.log(`  -> Successfully fixed and parsed ${file}`);
                } else {
                    console.log(`  -> File ${file} still has JSON syntax errors after removing markers, needs manual fix`);
                }
            }
        } catch (e) {
            console.error(`Error processing ${file}:`, e);
        }
    });
});
