import { fromEvent } from "graphcool-lib";

const getPackageIds = async (api, { names }) => {
  const { allPackages } = await api.request(
    `
      query GetPackagesByName($names: [String!]) {
        allPackages( filter: { name_in: $names } )
        { id, name }
      }
    `,
    { names }
  );

  return allPackages.reduce((ids, { name, id }) => {
    ids[name] = id;
    return ids;
  }, {});
};

const createSiteAndSettings = (api, { siteId, url, settings }) => {
  return api.request(
    `
      mutation createSiteAndSettings(
        $siteId: String!
        $url: String!
      ) {
        createSite(
          siteId: $siteId
          url: $url
          settings: [${settings
            .map(
              ({ packageId, data }) => `
                {
                  packageId: "${packageId}"
                  data: "${JSON.stringify(data).replace(/"/g, '\\"')}"
                }
              `
            )
            .join(",")}]
        ) {
          id
        }
      }
    `,
    { siteId, url }
  );
};

export default async event => {
  try {
    const api = fromEvent(event).api("simple/v1");
    const { siteId, url, settings } = event.data;

    const packageIds = await getPackageIds(api, {
      names: settings.map(s => s.packageName)
    });

    await createSiteAndSettings(api, {
      siteId,
      url,
      settings: settings.map(({ packageName, data }) => ({
        packageId: packageIds[packageName],
        data
      }))
    });

    return { data: { siteId } };
  } catch (error) {
    return { data: event.data, error: `something went wrong: ${error}` };
  }
};
