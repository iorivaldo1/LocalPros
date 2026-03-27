<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
    xmlns="http://www.opengis.net/sld"
    xmlns:ogc="http://www.opengis.net/ogc"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
    <NamedLayer>
        <Name>your_layer_name</Name>
        <UserStyle>
            <Title>Dynamic Filtering by Zoom and Level</Title>

            <FeatureTypeStyle>
                <Rule>
                    <Filter>
                        <ogc:PropertyIsEqualTo>
                            <ogc:PropertyName>level</ogc:PropertyName>
                            <ogc:Literal>1</ogc:Literal>
                        </ogc:PropertyIsEqualTo>
                    </Filter>
                    <LineSymbolizer>
                        <Stroke>
                            <CssParameter name="stroke">#0c74de</CssParameter>
                            <CssParameter name="stroke-width">2</CssParameter>
                        </Stroke>
                    </LineSymbolizer>
                    <PointSymbolizer>
                        <Geometry>
                            <ogc:Function name="startPoint">
                                <ogc:PropertyName>the_geom</ogc:PropertyName>
                            </ogc:Function>
                        </Geometry>
                        <Graphic>
                            <Mark>
                                <WellKnownName>square</WellKnownName>
                                <Stroke>
                                    <CssParameter name="stroke">0x00FF00</CssParameter>
                                    <CssParameter name="stroke-width">1.5</CssParameter>
                                </Stroke>
                            </Mark>
                            <Size>8</Size>
                        </Graphic>
                    </PointSymbolizer>
                    <PointSymbolizer>
                        <Geometry>
                            <ogc:Function name="endPoint">
                                <ogc:PropertyName>the_geom</ogc:PropertyName>
                            </ogc:Function>
                        </Geometry>
                        <Graphic>
                            <Mark>
                                <WellKnownName>circle</WellKnownName>
                                <Fill>
                                    <CssParameter name="fill">0xFF0000</CssParameter>
                                </Fill>
                            </Mark>
                            <Size>4</Size>
                        </Graphic>
                    </PointSymbolizer>
                </Rule>

                <Rule>
                    <MaxScaleDenominator>69885283.0036</MaxScaleDenominator>
                    <MinScaleDenominator>2132.72958385</MinScaleDenominator>
                    <Filter>
                        <ogc:PropertyIsEqualTo>
                            <ogc:PropertyName>level</ogc:PropertyName>
                            <ogc:Literal>2</ogc:Literal>
                        </ogc:PropertyIsEqualTo>
                    </Filter>
                    <LineSymbolizer>
                        <Stroke>
                            <CssParameter name="stroke">#25844b</CssParameter>
                            <CssParameter name="stroke-width">2</CssParameter>
                        </Stroke>
                    </LineSymbolizer>
                </Rule>

                <Rule>
                    <MaxScaleDenominator>4367830.18772</MaxScaleDenominator>
                    <MinScaleDenominator>2132.72958385</MinScaleDenominator>
                    <Filter>
                        <ogc:PropertyIsEqualTo>
                            <ogc:PropertyName>level</ogc:PropertyName>
                            <ogc:Literal>3</ogc:Literal>
                        </ogc:PropertyIsEqualTo>
                    </Filter>
                    <LineSymbolizer>
                        <Stroke>
                            <CssParameter name="stroke">#712a46</CssParameter>
                            <CssParameter name="stroke-width">2</CssParameter>
                        </Stroke>
                    </LineSymbolizer>
                </Rule>

                <Rule>
                    <MaxScaleDenominator>1091957.54693</MaxScaleDenominator>
                    <MinScaleDenominator>2132.72958385</MinScaleDenominator>
                    <Filter>
                        <ogc:PropertyIsEqualTo>
                            <ogc:PropertyName>level</ogc:PropertyName>
                            <ogc:Literal>4</ogc:Literal>
                        </ogc:PropertyIsEqualTo>
                    </Filter>
                    <LineSymbolizer>
                        <Stroke>
                            <CssParameter name="stroke">#b27d32</CssParameter>
                            <CssParameter name="stroke-width">2</CssParameter>
                        </Stroke>
                    </LineSymbolizer>
                </Rule>

                <Rule>
                    <MaxScaleDenominator>272989.386733</MaxScaleDenominator>
                    <MinScaleDenominator>2132.72958385</MinScaleDenominator>
                    <Filter>
                        <ogc:PropertyIsEqualTo>
                            <ogc:PropertyName>level</ogc:PropertyName>
                            <ogc:Literal>5</ogc:Literal>
                        </ogc:PropertyIsEqualTo>
                    </Filter>
                    <LineSymbolizer>
                        <Stroke>
                            <CssParameter name="stroke">#f33f8d</CssParameter>
                            <CssParameter name="stroke-width">2</CssParameter>
                        </Stroke>
                    </LineSymbolizer>
                </Rule>

                <Rule>
                    <MaxScaleDenominator>68247.3466832</MaxScaleDenominator>
                    <MinScaleDenominator>2132.72958385</MinScaleDenominator>
                    <Filter>
                        <ogc:PropertyIsEqualTo>
                            <ogc:PropertyName>level</ogc:PropertyName>
                            <ogc:Literal>6</ogc:Literal>
                        </ogc:PropertyIsEqualTo>
                    </Filter>
                    <LineSymbolizer>
                        <Stroke>
                            <CssParameter name="stroke">#142697</CssParameter>
                            <CssParameter name="stroke-width">2</CssParameter>
                        </Stroke>
                    </LineSymbolizer>
                </Rule>
            </FeatureTypeStyle>
        </UserStyle>
    </NamedLayer>
</StyledLayerDescriptor>