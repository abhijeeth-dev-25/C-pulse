#include <stdio.h>
#include <stdlib.h>

struct Node {
  int data;
  struct Node *left;
  struct Node *right;
};

/* CREATE NODE */
struct Node *createNode(int data) {
  struct Node *node = (struct Node *)malloc(sizeof(struct Node));
  node->data = data;
  node->left = NULL;
  node->right = NULL;
  return node;
}

/* SEARCH NODE */
struct Node *search(struct Node *root, int key) {
  if (root == NULL)
    return NULL;

  if (root->data == key)
    return root;

  struct Node *found = search(root->left, key);
  if (found)
    return found;

  return search(root->right, key);
}

/* INSERT LEFT */
void insertLeft(struct Node *root) {
  int parentValue, newValue;

  printf("Enter parent node value: ");
  scanf("%d", &parentValue);

  struct Node *parent = search(root, parentValue);

  if (parent == NULL) {
    printf("Parent node not found\n");
    return;
  }

  if (parent->left != NULL) {
    printf("Left child already exists\n");
    return;
  }

  printf("Enter value for left child: ");
  scanf("%d", &newValue);

  parent->left = createNode(newValue);
}

/* INSERT RIGHT */
void insertRight(struct Node *root) {
  int parentValue, newValue;

  printf("Enter parent node value: ");
  scanf("%d", &parentValue);

  struct Node *parent = search(root, parentValue);

  if (parent == NULL) {
    printf("Parent node not found\n");
    return;
  }

  if (parent->right != NULL) {
    printf("Right child already exists\n");
    return;
  }

  printf("Enter value for right child: ");
  scanf("%d", &newValue);

  parent->right = createNode(newValue);
}

/* DISPLAY TREE */
void inorder(struct Node *root) {
  if (root == NULL)
    return;

  inorder(root->left);
  printf("%d ", root->data);
  inorder(root->right);
}

/* UPDATE NODE */
void updateNode(struct Node *root) {
  int oldValue, newValue;

  printf("Enter value to update: ");
  scanf("%d", &oldValue);

  struct Node *node = search(root, oldValue);

  if (node == NULL) {
    printf("Node not found\n");
    return;
  }

  printf("Enter new value: ");
  scanf("%d", &newValue);

  node->data = newValue;
}

/* DELETE SUBTREE */
void deleteSubtree(struct Node *node) {
  if (node == NULL)
    return;

  deleteSubtree(node->left);
  deleteSubtree(node->right);
  free(node);
}

/* DELETE NODE */
void deleteNode(struct Node *root) {
  int value;

  printf("Enter node value to delete: ");
  scanf("%d", &value);

  if (root == NULL)
    return;

  if (root->left && root->left->data == value) {
    deleteSubtree(root->left);
    root->left = NULL;
    return;
  }

  if (root->right && root->right->data == value) {
    deleteSubtree(root->right);
    root->right = NULL;
    return;
  }

  printf("Deletion only supported for child nodes of root in this demo\n");
}

/* FREE TREE */
void freeTree(struct Node *root) {
  if (root == NULL)
    return;

  freeTree(root->left);
  freeTree(root->right);
  free(root);
}

int main() {

  int choice, rootValue;
  struct Node *root = NULL;

  printf("Enter root value: ");
  scanf("%d", &rootValue);

  root = createNode(rootValue);

  while (1) {

    printf("\n--- Binary Tree Menu ---\n");
    printf("1. Insert Left\n");
    printf("2. Insert Right\n");
    printf("3. Display Tree\n");
    printf("4. Search Node\n");
    printf("5. Update Node\n");
    printf("6. Delete Node\n");
    printf("7. Exit\n");
    printf("Enter choice: ");

    scanf("%d", &choice);

    if (choice == 1)
      insertLeft(root);

    else if (choice == 2)
      insertRight(root);

    else if (choice == 3) {
      printf("Tree (Inorder): ");
      inorder(root);
      printf("\n");
    }

    else if (choice == 4) {
      int key;
      printf("Enter value to search: ");
      scanf("%d", &key);

      struct Node *result = search(root, key);

      if (result)
        printf("Node found\n");
      else
        printf("Node not found\n");
    }

    else if (choice == 5)
      updateNode(root);

    else if (choice == 6)
      deleteNode(root);

    else if (choice == 7) {
      freeTree(root);
      printf("Memory freed. Exiting...\n");
      break;
    }

    else
      printf("Invalid choice\n");
  }

  return 0;
}
