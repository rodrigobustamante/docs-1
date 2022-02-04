const {randomUUID} = require('crypto');
const {
  createFilePath,
  createRemoteFileNode
} = require('gatsby-source-filesystem');
const path = require('path');

exports.sourceNodes = ({
  actions: {createNode},
  createNodeId,
  store,
  cache,
  reporter
}) =>
  // download Apollo Client typedoc output and save it as a file node
  createRemoteFileNode({
    url: 'https://61fc4e6768368d0007f0702c--apollo-client-docs.netlify.app/docs.json',
    store,
    cache,
    createNode,
    createNodeId,
    reporter
  });

exports.onCreateWebpackConfig = ({actions}) => {
  actions.setWebpackConfig({
    resolve: {
      fallback: {
        // fallbacks needed for Algolia search-insights
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        // because we use `path` a lot
        path: require.resolve('path-browserify')
      }
    }
  });
};

exports.onCreateNode = async ({node, getNode, loadNodeContent, actions}) => {
  const {type, mediaType} = node.internal;

  if (mediaType === 'application/json') {
    // save the raw content of JSON files as a field
    const content = await loadNodeContent(node);
    actions.createNodeField({
      node,
      name: 'content',
      value: content
    });
    return;
  }

  if (type === 'MarkdownRemark' || type === 'Mdx') {
    // add slugs for MD/MDX pages based on their file names
    const filePath = createFilePath({
      node,
      getNode
    });

    const {sourceInstanceName} = getNode(node.parent);
    actions.createNodeField({
      node,
      name: 'slug',
      // prefix slugs with their docset path (configured by source name)
      value: path.join('/', sourceInstanceName, filePath)
    });
  }
};

function getNavItems(items) {
  return Object.entries(items).map(([key, value]) => {
    const isGroup = typeof value !== 'string';
    return {
      id: randomUUID(),
      title: key,
      [isGroup ? 'children' : 'path']: isGroup ? getNavItems(value) : value
    };
  });
}

exports.createPages = async ({actions, graphql}) => {
  const {data} = await graphql(`
    {
      pages: allFile(filter: {extension: {in: ["md", "mdx"]}}) {
        nodes {
          id
          gitRemote {
            full_name
          }
          sourceInstanceName
          children {
            ... on Mdx {
              fields {
                slug
              }
            }
            ... on MarkdownRemark {
              fields {
                slug
              }
            }
          }
        }
      }
      configs: allFile(filter: {base: {eq: "config.json"}}) {
        nodes {
          fields {
            content
          }
          gitRemote {
            full_name
          }
          sourceInstanceName
        }
      }
    }
  `);

  const configs = data.configs.nodes.reduce((acc, node) => {
    const {title, version, sidebar} = JSON.parse(node.fields.content);
    return {
      ...acc,
      [node.sourceInstanceName]: {
        docset: title,
        currentVersion: version,
        navItems: getNavItems(sidebar)
      }
    };
  }, {});

  data.pages.nodes.forEach(({id, gitRemote, sourceInstanceName, children}) => {
    const [{fields}] = children;
    const versions =
      gitRemote &&
      data.configs.nodes
        .filter(node => node.gitRemote?.full_name === gitRemote.full_name)
        .map(node => {
          const {version} = JSON.parse(node.fields.content);
          return {
            label: version,
            slug: node.sourceInstanceName
          };
        });

    actions.createPage({
      path: fields.slug,
      component: require.resolve('./src/templates/page'),
      context: {
        id,
        versions,
        ...configs[sourceInstanceName]
      }
    });
  });
};
