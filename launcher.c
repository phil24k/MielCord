#define _GNU_SOURCE
#include <errno.h>
#include <libgen.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

int main(int argc, char **argv) {
    char exe_path[PATH_MAX];
    ssize_t len = readlink("/proc/self/exe", exe_path, sizeof(exe_path) - 1);
    if (len < 0) {
        fprintf(stderr, "mielcord: cannot resolve executable path: %s\n", strerror(errno));
        return 1;
    }
    exe_path[len] = '\0';

    char dir_buf[PATH_MAX];
    snprintf(dir_buf, sizeof(dir_buf), "%s", exe_path);
    char *dir = dirname(dir_buf);

    char script_path[PATH_MAX];
    snprintf(script_path, sizeof(script_path), "%s/server.py", dir);

    char **child_argv = calloc((size_t)argc + 2, sizeof(char *));
    if (!child_argv) {
        fprintf(stderr, "mielcord: out of memory\n");
        return 1;
    }

    child_argv[0] = "python3";
    child_argv[1] = script_path;
    for (int i = 1; i < argc; i++) {
        child_argv[i + 1] = argv[i];
    }
    child_argv[argc + 1] = NULL;

    execvp("python3", child_argv);
    fprintf(stderr, "mielcord: failed to start python3: %s\n", strerror(errno));
    free(child_argv);
    return 127;
}
